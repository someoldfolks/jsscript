window.dataLayer = window.dataLayer || [];

function splitNames(fullName) {
  const names = fullName.trim().split(/\s+/);

  if (names.length <= 1) return [fullName, ''];

  const lastName = names.pop();
  const firstName = names.join(' ');

  return [firstName, lastName];
}

function getParseStorage(storageKey) {
    const storage = localStorage.getItem(storageKey)
    return JSON.parse(atob(storage))
}

function valueToDataLayer (expectedValues, storageKey) {
    let data = {}
    const parse = getParseStorage(storageKey)
    Object.keys(parse).forEach(key => {
        if(expectedValues.includes(key)) data[key] = parse[key]
    })

    dataLayer.push({...data})
}

function getValueFromStorage (key, storageKey) {
    const parse = getParseStorage(storageKey)
    return parse[key]
}

function setValueFromStorage (key, value, storageKey) {
    const parse = getParseStorage(storageKey)
    parse[key] = value
    localStorage.setItem(storageKey, btoa(JSON.stringify(parse)))
}


function initStorage (storageKey, initialData) {
    localStorage.setItem(storageKey, btoa(JSON.stringify(initialData)))
    return true
}


(function () {
    if(window.loadedScriptOldFo) return false;
    window.loadedScriptOldFo = true
    const pushState = history.pushState;
    const replaceState = history.replaceState;

    const triggerEvent = (action) => {
        // const customEvent = new CustomEvent('historyChanged', {
        //     action: action, currentLocation: location.pathname
        // })
        const customEvent = new CustomEvent('historyChanged', {
            detail: {
                currentLocation: location.pathname,
                action: action
            }
        })
        window.dispatchEvent(customEvent)
    }

    history.pushState = function () {
        pushState.apply(this, arguments);
        triggerEvent('pushState')
    };

    history.replaceState = function () {
        replaceState.apply(this, arguments);
        triggerEvent('replaceState');
    };

    window.addEventListener('popstate', function () {
        triggerEvent('popstate');
    });
    
})();

// Decider
(() => {
    if(window.loadedScriptOldFoDec) return false;
    window.loadedScriptOldFoDec = true

    let currentActive = null

    const triggerEvent = (eventName) => {
        const customEvent = new CustomEvent(eventName)
        window.dispatchEvent(customEvent)
    }

    const rules = [
        {location: '/Member/StreamlinedRegister', cb: () => {
            triggerEvent('action_register')

        }, eventName: 'action_register'},
        {location: '/Account/Deposit', cb: () => {
            triggerEvent('action_deposit')
        }, eventName: 'action_deposit'},
        {location: '/Account/Withdraw', cb: () => {
            triggerEvent('action_withdraw')
        }, eventName: 'action_withdraw'},
    ]

    const main = (e) => {
        const tryFind = rules.find(rule => (rule.location === e.detail.currentLocation))
        if(localStorage.getItem('act_check_dep') && localStorage.getItem('act_check_dep') === true) {
            const oldValue = localStorage.getItem('act_check_dep')
            const newValue = parseFloat(document.querySelector('.nav-main-wallet strong').textContent) // need to check the value by dom
            if(oldValue < newValue) {
                valueToDataLayer(
                    ['phone_number', 'account_name', 'amount', 'actual_amount', 'payment_method', 'remark', 'username', 'upload_image', 'event'],
                    'act_check_dep'
                )
                localStorage.removeItem('act_check_dep')
            }
        }
        if(tryFind) {
            triggerEvent(tryFind.eventName)
            currentActive = tryFind.eventName
            return
        }
        if(currentActive) {
            triggerEvent(currentActive + '_end')
        }
        currentActive = null
    }
    window.addEventListener('historyChanged', main)
    main({detail: {currentLocation: location.pathname}})


    window.dataLayer = window.dataLayer || [];

    var originalPush = window.dataLayer.push;

    window.dataLayer.push = function() {
            var args = Array.prototype.slice.call(arguments);

            args.forEach(function(item) {

                if(item.event === 'balance_updated') {

                    if(localStorage.getItem('act_check_dep')) {

                        const info = JSON.parse(localStorage.getItem('memInfo'))

                        setValueFromStorage('profile_username', info.loginId, 'act_check_dep')
                        setValueFromStorage('profile_bank_name', info.bankName, 'act_check_dep')
                        setValueFromStorage('profile_bank_account_name', info.bankAcctName, 'act_check_dep')
                        setValueFromStorage('profile_bank_account_number', info.bankAcctNo, 'act_check_dep')
                        setValueFromStorage('profile_phone_number', info.contactNumber, 'act_check_dep')
                        valueToDataLayer(
                            ['phone_number', 'account_name', 'amount', 'actual_amount', 'payment_method', 'remark', 'username', 'upload_image', 'event',
                                'profile_username', 'profile_bank_name', 'profile_bank_account_name', 'profile_bank_account_number', 'profile_phone_number'
                            ],
                            'act_check_dep'
                        )
                        localStorage.removeItem('act_check_dep')
                    } else {

                    }
                }

                if(item.event === 'register_status' && item.register_status === 'success'){
                    if(!window.alreadyRegisterEvent) {
                        setValueFromStorage('event_id', 'reg_' + Math.random().toString(36).substring(2, 2 + 12), STORAGE_KEY)
                        valueToDataLayer(['username', 'full_name', 'phone_number', 'event', 'event_id', 'first_name', 'last_name'], 'act_reg')
                        window.alreadyRegisterEvent = true
                    }
                }
            });

            // Call original push
            return originalPush.apply(window.dataLayer, args);
        };


})();


// Registration
(() => {
    document.addEventListener('DOMContentLoaded', () => {

        if(window.loadedScriptOldFoReg) return false;
        window.loadedScriptOldFoReg = true

        const STORAGE_KEY = 'act_reg';


        const listeners = []

        const registerListener = (event, selector, fn) => {
            const handler = (e) => {
                const el = e.target.closest(selector)
                if (el) fn(e, el)
            }

            listeners.push({
                event,
                selector,
                fn,
                handler,
                active: false
            })
        }

        registerListener('change', '[formcontrolname="userName"]', (e) => {
            setValueFromStorage('username', e.target.value, STORAGE_KEY)
        })
        registerListener('change', '[formcontrolname="bankAcctName"]', (e) => {
            setValueFromStorage('full_name', e.target.value, STORAGE_KEY)
            const splitName = splitNames(e.target.value)
            setValueFromStorage('first_name', splitName[0], STORAGE_KEY)
            setValueFromStorage('last_name', splitName[1], STORAGE_KEY)
        })
        registerListener('change', '[formcontrolname="phoneNumber"]', (e) => {
            setValueFromStorage('phone_number', e.target.value, STORAGE_KEY)
        })
        registerListener('change', '[formcontrolname="countryCode"]', (e) => {
            setValueFromStorage('country_code', e.target.value, STORAGE_KEY)
        })


        registerListener('submit', 'form', () => {
            if(!window.alreadyRegisterEvent) {
                setValueFromStorage('event_id', 'reg_' + Math.random().toString(36).substring(2, 2 + 12), STORAGE_KEY)
                valueToDataLayer(['username', 'full_name', 'phone_number', 'event', 'event_id', 'first_name', 'last_name'], STORAGE_KEY)
                window.alreadyRegisterEvent = true
            }
        })



        window.addEventListener('action_register', () => {
            listeners.forEach(item => {
                if (!item.active) {
                    document.body.addEventListener(item.event, item.handler)
                    item.active = true
                }
            })
        })

        window.addEventListener('action_register_end', () => {
            listeners.forEach(item => {
                if (item.active) {
                    document.body.removeEventListener(item.event, item.handler)
                    item.active = false
                }
            })
        })


        initStorage(STORAGE_KEY, {
            action: 'reg',
            event: 'Register'
        })
    })
})();

// Deposit
(() => {
    document.addEventListener('DOMContentLoaded', () => {

        if(window.loadedScriptOldFoDep) return false;
        window.loadedScriptOldFoDep = true

        const STORAGE_KEY = 'act_dep';
        const STORAGE_KEY_POST = 'act_check_dep';


        const listeners = []

        const registerListener = (event, selector, fn) => {
            const handler = (e) => {
                const el = e.target.closest(selector)
                if (el) fn(e, el)
            }

            listeners.push({
                event,
                selector,
                fn,
                handler,
                active: false
            })
        }

        registerListener('change', '[name="wallet"]', (e) => {
            setValueFromStorage('payment_method', e.target.value, STORAGE_KEY)
            if(e.target.value === 'ewallet') {
                // check for mobile already exist
                const phone = document.querySelector('[name="dPhoneNumber"]')?.value
                if(phone) {
                    setValueFromStorage('phone_number', phone, STORAGE_KEY)
                }
            }
        })


        registerListener('change', '[name="dPhoneNumber"]', e => {
            setValueFromStorage('phone_number', e.target.value, STORAGE_KEY)
        })
        registerListener('change', 'input[name="provider"]',  (e) => {
            setTimeout(() => {
                const accName = document.querySelector('[formcontrolname="bankAccountName"]')?.value
                if(accName) {
                    setValueFromStorage('account_name', accName, STORAGE_KEY)
                }
            }, 1000)
        })
        registerListener('change', '[name="payment"]', e => {
            setTimeout(() => {
                const accName = document.querySelector('[formcontrolname="bankAccountName"]')?.value
                if(accName) {
                    setValueFromStorage('account_name', accName, STORAGE_KEY)
                }
            }, 1000)
        })

        const checkForAccountNameAndPhone = () => {
            const accName = document.querySelector('[formcontrolname="bankAccountName"]')?.value
            if(accName) {
                setValueFromStorage('account_name', accName, STORAGE_KEY)
            }
            const phone = document.querySelector('[name="dPhoneNumber"]')?.value
            if(phone) {
                setValueFromStorage('phone_number', phone, STORAGE_KEY)
            }
        }

        registerListener('click', '[data_axq^="amount_"]', (e) => {
            const amount = e.target.getAttribute('data_axq').replace('amount_', '')
            const actualMoney = document.querySelector('[name="dActualMoney"]').value
            setValueFromStorage('amount', amount, STORAGE_KEY)
            setValueFromStorage('actual_amount', actualMoney, STORAGE_KEY)
            checkForAccountNameAndPhone()
        })
        registerListener('change', '[name="dAmount"]', (e) => {
            setValueFromStorage('amount', e.target.value, STORAGE_KEY)
            const actualMoney = document.querySelector('[name="dActualMoney"]').value
            setValueFromStorage('actual_amount', actualMoney, STORAGE_KEY)
            checkForAccountNameAndPhone()
        })

        registerListener('change', '[formcontrolname="bankAccountNumber"]', e => {
            setValueFromStorage('account_number', e.target.value, STORAGE_KEY)
        })

        registerListener('change', '[formcontrolname="bankName"]', (e) => {
            setValueFromStorage('bank_name', e.target.value, STORAGE_KEY)
        })
        registerListener('change', '[name="dRemark"]', (e) => {
            setValueFromStorage('remark', e.target.value, STORAGE_KEY)
        })


        registerListener('click', '.deposit-col .btn-group', () => {
            valueToDataLayer(
                ['phone_number', 'account_name', 'amount', 'actual_amount', 'payment_method', 'remark', 'username', 'event'],
                STORAGE_KEY
            )
        })

        let observer = false
        const observeCb = () => {
            if(document.body.classList.contains('swal2-shown')) {
                const popup = document.querySelector('.swal2-popup.swal2-modal')
                if(popup && !!popup.textContent.toLowerCase().match('qr')) {
                    initStorage(STORAGE_KEY_POST, {event: "Purchase", action: "lis_dep"})
                    console.log('fromObserve')
                    setValueFromStorage('listening', 'true', STORAGE_KEY_POST)
                    const amount = document.querySelector('[name="dAmount"]')?.value
                    if(amount) {
                        setValueFromStorage('amount', amount, STORAGE_KEY_POST)
                    }

                    const actualAmount = document.querySelector('[name="dActualMoney"]')?.value
                    if(actualAmount) {
                        setValueFromStorage('actual_amount', actualAmount, STORAGE_KEY_POST)
                    }

                    const paymentMethod = document.querySelector('.deposit-col .select .target')?.textContent?.trim()
                    if(paymentMethod) {
                        setValueFromStorage('payment_method', paymentMethod, STORAGE_KEY_POST)
                    }
                    const oldValue = parseFloat(document.querySelector('.nav-main-wallet strong')?.textContent)
                    if(oldValue) {
                        setValueFromStorage('old_value', oldValue, STORAGE_KEY_POST)
                    }
                    if(observer) {
                        observer.disconnect()
                    }
                } else if (popup.querySelector('.swal2-success-fix')) {
                    initStorage(STORAGE_KEY_POST, {event: "Purchase", action: "lis_dep"})
                    const uploadEl = document.querySelector('.upload-select')
                    if(uploadEl) {
                        const isUpload = uploadEl?.textContent?.trim() != 'Choose File'
                        setValueFromStorage('upload_image', isUpload, STORAGE_KEY)
                        setValueFromStorage('upload_image', isUpload, STORAGE_KEY_POST)
                    }

                    const phone = document.querySelector('[name="dPhoneNumber"]')?.value
                    if(phone) {
                        setValueFromStorage('phone_number', phone, STORAGE_KEY)
                        setValueFromStorage('phone_number', phone, STORAGE_KEY_POST)
                    }

                    const amount = document.querySelector('[name="dAmount"]')?.value
                    if(amount) {
                        setValueFromStorage('amount', amount, STORAGE_KEY)
                        setValueFromStorage('amount', amount, STORAGE_KEY_POST)
                    }

                    const actualAmount = document.querySelector('[name="dActualMoney"]')?.value
                    if(actualAmount) {
                        setValueFromStorage('actual_amount', actualAmount, STORAGE_KEY)
                        setValueFromStorage('actual_amount', actualAmount, STORAGE_KEY_POST)
                    }

                    const paymentMethod = document.querySelector('.deposit-col .select .target')?.textContent?.trim()
                    if(paymentMethod) {
                        setValueFromStorage('payment_method', paymentMethod, STORAGE_KEY)
                        setValueFromStorage('payment_method', paymentMethod, STORAGE_KEY_POST)
                    }

                    const accountName = document.querySelector('[formcontrolname="bankAccountName"]')?.value
                    if(accountName) {
                        setValueFromStorage('account_name', accountName, STORAGE_KEY)
                        setValueFromStorage('account_name', accountName, STORAGE_KEY_POST)
                    }

                    const accountNumber = document.querySelector('[formcontrolname="bankAccountNumber"]')?.value
                    if(accountNumber) {
                        setValueFromStorage('account_number', accountNumber, STORAGE_KEY)
                        setValueFromStorage('account_number', accountNumber, STORAGE_KEY_POST)
                    }

                    const oldValue = parseFloat(document.querySelector('.nav-main-wallet strong')?.textContent)
                    if(oldValue) {
                        setValueFromStorage('old_value', oldValue, STORAGE_KEY_POST)
                    }



                    // valueToDataLayer(
                    //     ['phone_number', 'account_name', 'account_number', 'amount', 'actual_amount', 'payment_method', 'remark', 'username', 'upload_image', 'event'],
                    //     STORAGE_KEY
                    // )

                    // setValueFromStorage('upload_image', isUpload, STORAGE_KEY_POST)
                    setValueFromStorage('listening', 'true', STORAGE_KEY_POST)
                    
                    // setValueFromStorage('amount', amount, STORAGE_KEY_POST)
                    // setValueFromStorage('actual_amount', actualAmount, STORAGE_KEY_POST)
                    // setValueFromStorage('payment_method', paymentMethod, STORAGE_KEY_POST)
                    // setValueFromStorage('account_name', accountName, STORAGE_KEY_POST)
                    // setValueFromStorage('account_number', accountNumber, STORAGE_KEY_POST)
                    if(observer) {
                        observer.disconnect()
                    }
                }
                
            }
        }



        window.addEventListener('action_deposit', () => {
            listeners.forEach(item => {
                if (!item.active) {
                    document.body.addEventListener(item.event, item.handler)
                    item.active = true
                }
            })
            observer = new MutationObserver(observeCb)
            observer.observe(document.body, {attributes: true})
            observeCb()

            const info = JSON.parse(localStorage.getItem('memInfo'))

            setValueFromStorage('profile_username', info.loginId, 'act_check_dep')
            setValueFromStorage('profile_bank_name', info.bankName, 'act_check_dep')
            setValueFromStorage('profile_bank_account_name', info.bankAcctName, 'act_check_dep')
            setValueFromStorage('profile_bank_account_number', info.bankAcctNo, 'act_check_dep')
            setValueFromStorage('profile_phone_number', info.contactNumber, 'act_check_dep')
            setValueFromStorage('profile_username', info.loginId, 'act_dep')
            setValueFromStorage('profile_bank_name', info.bankName, 'act_dep')
            setValueFromStorage('profile_bank_account_name', info.bankAcctName, 'act_dep')
            setValueFromStorage('profile_bank_account_number', info.bankAcctNo, 'act_dep')
            setValueFromStorage('profile_phone_number', info.contactNumber, 'act_dep')

        })

        window.addEventListener('action_deposit_end', () => {
            listeners.forEach(item => {
                if (item.active) {
                    document.body.removeEventListener(item.event, item.handler)
                    item.active = false
                }
            })
            if(observer) {
                observer.disconnect()
            }
        })


        initStorage(STORAGE_KEY, {
            action: "dep",
            event: "Purchase"
        })
    })
})();




// Withdrawal
(() => {
    document.addEventListener('DOMContentLoaded', () => {

        if(window.loadedScriptOldFoWit) return false;
        window.loadedScriptOldFoWit = true

        const STORAGE_KEY = 'act_wit';


        const listeners = []

        const registerListener = (event, selector, fn) => {
            const handler = (e) => {
                const el = e.target.closest(selector)
                if (el) fn(e, el)
            }

            listeners.push({
                event,
                selector,
                fn,
                handler,
                active: false
            })
        }

        registerListener('change', '[name="wallet"]', (e) => {
            setValueFromStorage('payment_method', e.target.value, STORAGE_KEY)
            // if(e.target.value === 'ewallet') {
            //     // check for mobile already exist
            //     const phone = document.querySelector('[name="dPhoneNumber"]').value
            //     if(phone) {
            //         setValueFromStorage('phone_number', phone)
            //     }
            //     registerListener('change', '[name="dPhoneNumber"]', e => {
            //         setValueFromStorage('phone_number', e.target.value, STORAGE_KEY)
            //     })
            // }
        })
        registerListener('change', '[name="wAmount"]', (e) => {
            const phone = document.querySelector('[name="wPhone"]')?.value
            if(phone) {
                setValueFromStorage('phone', phone, STORAGE_KEY)
            }
            const accountNum = document.querySelector('[formcontrolname="bankAccountNumber"]')?.value
            if(accountNum) {
                setValueFromStorage('account_number', accountNum, STORAGE_KEY)
            }
            const accountName = document.querySelector('[formcontrolname="bankAccountName"]')?.value
            if(accountName) {
                setValueFromStorage('account_number', accountName, STORAGE_KEY)
            }
            setValueFromStorage('amount', e.target.value, STORAGE_KEY)
            const actualMoney = document.querySelector('[name="wNetMoney"]')?.value
            setValueFromStorage('actual_amount', actualMoney, STORAGE_KEY)
            
        })
        registerListener('change', '[name="wPhone"]', e => {
            setValueFromStorage('phone', e.target.value, STORAGE_KEY)
        })
        registerListener('change', '[formcontrolname="bankAccountNumber"]', e => {
            setValueFromStorage('account_number', e.target.value, STORAGE_KEY)
        })
        registerListener('change', '[name="dRemark"]', (e) => {
            setValueFromStorage('remark', e.target.value, STORAGE_KEY)
        })


        // registerListener('click', 'app-withdraw button.btn-submit', () => {
        //     valueToDataLayer(
        //         ['phone', 'account_number', 'amount', 'actual_amount', 'event', 'remark'],
        //         STORAGE_KEY
        //     )
        // })

        let observer = false
        const observeCb = () => {
            if(document.body.classList.contains('swal2-shown') && document.querySelector('.swal2-success-fix')) {
                valueToDataLayer(
                    ['phone', 'account_number', 'amount', 'actual_amount', 'event', 'remark'],
                    STORAGE_KEY
                )
                observer.disconnect()
            }
        }
        


        window.addEventListener('action_withdraw', () => {
            listeners.forEach(item => {
                if (!item.active) {
                    document.body.addEventListener(item.event, item.handler)
                    item.active = true
                }
            })
            observer = new MutationObserver(observeCb)
            observer.observe(document.body, {'attributes': true})
            
            observeCb()
        })

        window.addEventListener('action_withdraw_end', () => {
            listeners.forEach(item => {
                if (item.active) {
                    document.body.removeEventListener(item.event, item.handler)
                    item.active = false
                }
            })

            if(observer) {
                observer.disconnect()
            }
        })


        initStorage(STORAGE_KEY, {
            action: "wit",
            event: "Withdrawal"
        })
    })
})();



(() => {


    (function() {
    function f(d) {
        var h = localStorage.getItem("gtm_pending_deposit_id")
          , b = localStorage.getItem("gtm_pre_deposit_balance");
        if (!h || !b)
            return !1;
        a: {
            var a = [".nav-money .balence", ".member-balance .member-money", ".balance-nav strong.money"];
            for (var c = 0; c < a.length; c++) {
                var g = document.querySelector(a[c]);
                if (g) {
                    a = {
                        element: g,
                        text: g.innerText || g.textContent || ""
                    };
                    break a
                }
            }
            a = null
        }
        if (!a)
            return console.log("[PURCHASE] Balance element not found yet (source: " + d + ")"),
            !1;
        a = String(a.text || "").replace(/[^0-9.]/g, "");
        a = parseFloat(a);
        a = isNaN(a) ? null : a;
        b = parseFloat(b);
        const itemInfo = localStorage.getItem('memInfo');
        const listening = JSON.parse(atob(localStorage.getItem('act_check_dep')));
        if (a === null || isNaN(b))
            return console.log("[PURCHASE] Invalid numbers. current\x3d" + a + " baseline\x3d" + b),
            !1;
        console.log("[PURCHASE] Comparing current\x3d" + a + " vs baseline\x3d" + b + " (source: " + d + ")");
        return a > b ? (c = a - b,
        c = Math.round(c) * 1E3,
        console.log("[PURCHASE] \u2705 FIRE source\x3d" + d + " baseline\x3d" + b + " current\x3d" + a + " amount\x3d" + c),
        window.dataLayer = window.dataLayer || [],
        window.dataLayer.push({
            event: "Purchase_2",
            event_id: h,
            checkout_data: {
                transaction_id: "BAL_" + h + "_" + Date.now(),
                value: c,
                currency: "IDR",
                profile_username: itemInfo.loginId,
                profile_bank_name: itemInfo.bankName,
                profile_bank_account_name: itemInfo.bankAcctName,
                profile_bank_account_number: itemInfo.bankAcctNo,
                profile_phone_number: itemInfo.contactNumber,
                payment_method: listening.payment_method
            }
        }),
        localStorage.removeItem("gtm_pending_deposit_id"),
        localStorage.removeItem("gtm_pre_deposit_balance"),
        console.log("[PURCHASE] Cleared localStorage flags after fire."),
        !0) : !1
    }
    function n() {
        e || (e = setInterval(function() {
            localStorage.getItem("gtm_pending_deposit_id") && localStorage.getItem("gtm_pre_deposit_balance") ? (l++,
            l >= p ? (clearInterval(e),
            e = null,
            console.log("[PURCHASE] Polling stopped after timeout")) : f("polling")) : e && (clearInterval(e),
            e = null)
        }, 2E3))
    }
    if (!window._gtmBalanceObserverActive) {
        window._gtmBalanceObserverActive = !0;
        f("initial");
        console.log("[PURCHASE] Attaching MutationObserver...");
        var q = new MutationObserver(function(d) {
            f("mutation")
        }
        );
        q.observe(document.body || document.documentElement, {
            childList: !0,
            subtree: !0,
            characterData: !0
        });
        var e = null
          , p = 60
          , l = 0;
        localStorage.getItem("gtm_pending_deposit_id") && localStorage.getItem("gtm_pre_deposit_balance") && n();
        var m = location.href
          , k = function() {
            var d = location.href;
            d !== m && (m = d,
            setTimeout(function() {
                f("navigation")
            }, 500))
        };
        window.addEventListener("popstate", k);
        var r = history.pushState;
        history.pushState = function() {
            r.apply(history, arguments);
            k()
        }
        ;
        var t = history.replaceState;
        history.replaceState = function() {
            t.apply(history, arguments);
            k()
        }
    }
}
)();

})();
