let BUSContract = null;
let POOLContract = null;
let LPContract = null;
let BUSDContract = null;
(function ($) {
    "use strict"; // Start of use strict

    let VueBSC = {
        data() {
            return {
                wallet: {
                    metamask: false,
                    auth: false,
                    account: ''
                }
            };
        },
          created() {
            let self = this,
                tries = 0;
            setTimeout(async function initTimer() {
                if (!window.ethereum) return ++tries < 50 ? setTimeout(initTimer, 1000) : null;
                window.ethereum.request({ method: 'eth_requestAccounts' });
                self.wallet.account = window.ethereum.selectedAddress;
                self.wallet.metamask = !!window.ethereum.isMetaMask;
                window.ethereum.on('accountsChanged',async function() {
                    self.wallet.account = await window.ethereum.selectedAddress;
                });
                setTimeout(async function chechAuth() {
                    window.ethereum.enable();
                    self.wallet.auth = window.ethereum.isMetamask;
                    if (!self.wallet.auth) setTimeout(chechAuth, 200);
                    else self.wallet.account = window.ethereum.selectedAddress;
                }, 1000);
            }, 1000);
        },
        methods: {
            getWeb3() {
                return new Promise(async(resolve, reject) => {
                    window.ethereum.request({ method: 'eth_requestAccounts' });
                    window.ethereum ? resolve(new Web3(window.ethereum)) : reject('Metamask not installed');
					this.wallet.account = await window.ethereum.selectedAddress;
                });
            }
        }
    };

    window.App = new Vue({
        mixins: [VueBSC],
        el: '#about',
        data: {
            contract_address: "0xb798AfE33d17cE629bF15DF559b004FdB5870938",
            FarmContract: {
                balance: 0,
                staked: 0,
                wallet: 0,
                total_busd: 0,
                total_stakers: 0,
                total_staked: 0,
                total_supply: 0,
                busd_reward: 0,
                lp_reward: 0,
                bfarm_reward: 0
            },
            farm: {
              amount: 0,
            }
        },
        mounted() {
            this.getContractInfo();
            // this.getUserInfo();
            // this.getRefInfo();
            setInterval(() => {
                // this.getABalance();
                // this.getUserInfo();
                this.getContractInfo();
                // this.getRefInfo();
            }, 1000);
        },
        watch: {
            'wallet.account'() {
				self = this;
					self.getWeb3().then(web3 => {
						$.getJSON("./js/abis/BFARM.json",async function(abis){
                            BUSContract = new web3.eth.Contract(abis.abi,abis.contractAddress);
                            BUSContract.methods.name().call().then(name => {
                                console.log("Contract Name: " + name)
                            })
                        });
                        $.getJSON("./js/abis/BusfarmPool.json",async function(abis){
                            POOLContract = new web3.eth.Contract(abis.abi,abis.contractAddress);
                            POOLContract.methods.txfee().call().then(fee => {
                                console.log("Contract Fee: " + fee)
                            })
                        });
                        $.getJSON("./js/abis/lpToken.json",async function(abis){
                            LPContract = new web3.eth.Contract(abis.abi,abis.contractAddress);
                            LPContract.methods.balanceOf(self.wallet.account).call().then(bal => {
                                console.log("LP Balance: " + bal)
                            })
                        });
                        $.getJSON("./js/abis/BUSD.json",async function(abis){
                            BUSDContract = new web3.eth.Contract(abis.abi,abis.contractAddress);
                            BUSDContract.methods.name().call().then(res => {
                                console.log("Token Name: " + res)
                            })
                        });
                        });
						self.getContractInfo();
						// self.getEventsList();
						// self.getUserInfo();
						// self.getRefInfo();
				
				
            }
        },
        methods: {
           
            getContractInfo() {
                this.getWeb3().then(web3 => {

                    if (POOLContract) {
                        POOLContract.methods.balanceOf(this.wallet.account).call().then(res => {
                              this.FarmContract.staked = parseFloat(res/1e18).toFixed(4);
                        }).catch(error => {});
                        POOLContract.methods.earned1(this.wallet.account).call().then(res => {
                              this.FarmContract.busd_reward = parseFloat(res/1e18).toFixed(4);
                        }).catch(error => {});
                        POOLContract.methods.totalStaked().call().then(res => {
                            this.FarmContract.total_staked = parseFloat(res/1e18).toFixed(4);
                      }).catch(error => {});
                      POOLContract.methods.totalStakers().call().then(res => {
                        this.FarmContract.total_stakers = res;
                  }).catch(error => {});
                  POOLContract.methods.totalSupply().call().then(res => {
                    this.FarmContract.total_supply = parseFloat(res/1e18).toFixed(4);
              }).catch(error => {});
                    }
                    if(LPContract){
                        LPContract.methods.balanceOf(self.wallet.account).call().then(res => {
                            this.FarmContract.balance = parseFloat(res/1e18).toFixed(4);
                        })
                    }
                    if(BUSDContract){
                        this.calculateBusd();
                    }
                });
            },
           async calculateBusd(){
                        let supply = await BUSDContract.methods.totalSupply().call();
                        let owner = await BUSDContract.methods.getOwner().call();
                        let bal = await BUSDContract.methods.balanceOf(owner).call();
                        let BusdDist = parseInt(supply)- parseInt(bal);
                        this.FarmContract.total_busd = parseFloat(BusdDist/1e18).toFixed(4);
            },
            
            approveLP(amount) {
            var self = this;
            console.log("Amount: " + amount);
                amount = parseFloat(amount) || 0;
                if (amount >= 0.01) {
                    this.getWeb3().then(web3 => {
                        LPContract.methods.approve(self.contract_address, (amount * 1e18).toLocaleString('fullwide', {
                            useGrouping: false
                        })).send({
                            feeLimit: 1000000000, from: self.wallet.account
                        }).then(res => {
                                this.getContractInfo();
                            }).catch(error => {});
                        });
                       
                }
            },
           
                  getBusdReward() {
                this.getWeb3().then(web3 => {
                    POOLContract.methods.getReward1().send({
                        feeLimit: 1e9,
                        shouldPollResponse: true,
                        from:self.wallet.account
                    }).then(res => {
                        this.getContractInfo();
                    }).catch(error => {});
                });
            },
            withdraw(amount) {
                this.getWeb3().then(web3 => {
                    POOLContract.methods.withdraw((amount * 1e18).toLocaleString('fullwide', {
                        useGrouping: false
                    })).send({
                        feeLimit: 1e9,
                        shouldPollResponse: true,
						from: this.wallet.account
                    }).then(res => {
                        this.getContractInfo();
                    }).catch(error => {});
                });
            }, 
            depositeLP(amount) {
                this.getWeb3().then(web3 => {
                    POOLContract.methods.farm((amount * 1e18).toLocaleString('fullwide', {
                        useGrouping: false
                    })).send({
                        feeLimit: 1e9,
                        shouldPollResponse: true,
						from: this.wallet.account
                    }).then(res => {
                        this.getContractInfo();
                    }).catch(error => {});
                });
            },

              maxLP() {
                this.farm.amount = this.FarmContract.balance
            }
        }
    });

    // Smooth scrolling using jQuery easing
    $('a.js-scroll-trigger[href*="#"]:not([href="#"])').click(function () {
        if (
            location.pathname.replace(/^\//, "") ==
                this.pathname.replace(/^\//, "") &&
            location.hostname == this.hostname
        ) {
            var target = $(this.hash);
            target = target.length
                ? target
                : $("[name=" + this.hash.slice(1) + "]");
            if (target.length) {
                $("html, body").animate(
                    {
                        scrollTop: target.offset().top - 70,
                    },
                    1000,
                    "easeInOutExpo"
                );
                return false;
            }
        }
    });

    // Closes responsive menu when a scroll trigger link is clicked
    $(".js-scroll-trigger").click(function () {
        $(".navbar-collapse").collapse("hide");
    });

    // Activate scrollspy to add active class to navbar items on scroll
    $("body").scrollspy({
        target: "#mainNav",
        offset: 100,
    });

    // Collapse Navbar
    var navbarCollapse = function () {
        if ($("#mainNav").offset().top > 100) {
            $("#mainNav").addClass("navbar-shrink");
        } else {
            $("#mainNav").removeClass("navbar-shrink");
        }
    };
    // Collapse now if page is not at top
    navbarCollapse();
    // Collapse the navbar when page is scrolled
    $(window).scroll(navbarCollapse);

    // number animators
    animateValue("num-total-supply", 0, 30000000, 5000)
    animateValue("num-circulating-supply", 0, 20243142, 6000)
    animateValue("num-tokens-burnt", 0, 2402534, 7000)

    // init web3
    if (window.ethereum)
    {
        window.web3 = new Web3(window.ethereum);
        window.ethereum.on('accountsChanged', metamaskRefresh);
        if (web3.currentProvider.selectedAddress !== null)
        {
            metamaskRefresh([web3.currentProvider.selectedAddress]);
        }
    }

})(jQuery); // End of use strict

function animateValue(id, start, end, duration) {
    // assumes integer values for start and end

    var obj = document.getElementById(id);
    if(obj==null) return;
    var range = end - start;
    // no timer shorter than 50ms (not really visible any way)
    var minTimer = 50;
    // calc step time to show all interediate values
    var stepTime = Math.abs(Math.floor(duration / range));

    // never go below minTimer
    stepTime = Math.max(stepTime, minTimer);

    // get current time and calculate desired end time
    var startTime = new Date().getTime();
    var endTime = startTime + duration;
    var timer;

    function run() {
        var now = new Date().getTime();
        var remaining = Math.max((endTime - now) / duration, 0);
        var value = Math.round(end - (remaining * range));
        obj.innerHTML = new Intl.NumberFormat('en-US').format(value);
        if (value == end) {
            clearInterval(timer);
        }
    }

    timer = setInterval(run, stepTime);
    run();
}

function metamaskConnect()
{
    console.log(window.ethereum);
    console.info("ümmm?");
    if (window.ethereum) {
        window.ethereum.send('eth_requestAccounts');
        return true;
    }
    else
    {
        $("#metamask-fail-modal").modal('show');
    }
    return false;
}

function metamaskRefresh(e)
{
    if (e.length > 0)
    {
        $("#btn-connect-metamask")
            .removeClass("btn-primary")
            .removeClass("btn-coincustom")
            .addClass("btn-success")
            .addClass("btn-coincustom-connected");

        $("#btn-connect-metamask > span.text").text("CONNECTED");
    }
    else
    {
        $("#btn-connect-metamask")
            .removeClass("btn-success")
            .removeClass("btn-coincustom-connected")
            .addClass("btn-primary")
            .addClass("btn-coincustom");

        $("#btn-connect-metamask > span.text").text("CONNECT");
    }
}

function honk()
{
    document.getElementById("audio-horn").play();
    const element = document.getElementById('busfarm-logo');
    element.classList.remove('animate__animated', 'animate__bounce');
    element.classList.add('animate__animated', 'animate__tada');
}

function fee(){
    POOLContract.methods.txfee().call().then(fee => {
                    console.log("Contract Fee: " + fee)
                })
}