.profile-header-overlay {
    margin-top: -85px !important;
}

.profile-avatar-left {
    background-color: transparent;
}

.cover-blur-overlay {
    display: none;
}

.cover-gradient-overlay {
    display: none;
}

.profile-avatar-left .profile-avatar-gradient {
  display: none;
}

.profile-currently-wearing {
  display: none;
}

.avatar-toggle-button {
    display: none;
}

inject this inside of the .profile-tab-content .padding-top-xxlarge on the roblox.com/users/{userId}/profile#!/about

<div class="profile-game ng-scope section" ng-controller="profileGridController" ng-init="init('game-cards','game-container')" ng-class="{'section': !isGridOn,
                    'container-list': isGridOn}">
        <div class="container-header" data-rovalra-processed="true">
            <h3 ng-non-bindable="">Currently Wearing</h3>
            
        </div>
        <div ng-show="isGridOn" class="game-grid ng-hide">
            <ul class="hlist game-cards" style="max-height: -8px" horizontal-scroll-bar="loadMore()">
                        <div class="game-container shown" data-index="0" ng-class="{'shown': 0 &lt; visibleItems}">


<li class="list-item game-card game-tile">
    <div class="game-card-container">
        <a href="https://www.roblox.com/games/98302704001954/YOU-CANT-ESCAPE-this-GAME" class="game-card-link rovalra-paid-price-processed">
            <div class="game-card-thumb-container">
                    <img class="game-card-thumb ng-isolate-scope" data-="" src="https://tr.rbxcdn.com/180DAY-80c345287aacf646cbd730c609e80b60/352/352/Image/Png/noFilter" alt="YOU CANT ESCAPE this GAME" thumbnail="{&quot;Final&quot;:true,&quot;Url&quot;:&quot;https://tr.rbxcdn.com/180DAY-80c345287aacf646cbd730c609e80b60/352/352/Image/Png/noFilter&quot;,&quot;RetryUrl&quot;:null,&quot;UserId&quot;:0,&quot;EndpointType&quot;:&quot;Avatar&quot;}" image-retry="">
            </div>
            <div class="game-card-name game-name-title" title="YOU CANT ESCAPE this GAME" ng-non-bindable="">
                YOU CANT ESCAPE this GAME
            </div>
            <div class="game-card-info">
                    
                    <span class="info-label vote-percentage-label "><span class="rovalra-modern-icon"><svg viewBox="0 0 2048 2105.0047" xmlns="http://www.w3.org/2000/svg"><path d="M1179 192q-37 0-64 27t-27 64v202q0 27-19 46L805 795q-18 18-27.5 41.5T768 885v606q0 21 8.5 41.5T800 1568q47 47 145 87 82 33 180 54 88 19 141 19h361q25 0 48.5-9.5t41.5-27.5l11-11q22-22 31.5-53t3.5-62l-7-31q-5-29 2.5-58t27.5-52l26-30q21-23 28-53.5t0-61.5l-18-72q-7-26-2.5-53t19.5-49l12-17q21-32 21-71v-57q0-35-17-64.5t-46.5-46.5q-29.5-17-64.5-17h-415q-1 0-1.5-1t.5-1q38-50 59-110.5t21-124.5V421q0-63-30.5-115.5t-83-83Q1242 192 1179 192zM348 1773l390-89q-15-12-28-25-34-34-52-77.5t-18-90.5V885q0-62 28-117H320q-35 0-64.5 17T209 831.5Q192 861 192 896v752q0 40 22.5 72t58.5 47q36 15 75 6z" fill="currentColor"></path></svg></span>100%</span>
                    <span class="info-label no-vote hidden"></span>
                    
                    <span class="info-label playing-counts-label" title="0"><span class="rovalra-modern-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><path d="M11.7142 2.56785C12.0165 1.43977 13.176 0.77031 14.3041 1.07258L20.4318 2.71451C21.5599 3.01678 22.2294 4.17631 21.9271 5.3044L20.2852 11.4321C19.9829 12.5602 18.8234 13.2297 17.6953 12.9274L11.5676 11.2855C10.4395 10.9832 9.77001 9.82369 10.0723 8.6956L11.7142 2.56785Z" fill="currentColor"></path><path d="M6.83768 18.9378C7.33735 16.6394 9.37144 15 11.7236 15H20.2758C22.2895 15 24.0702 16.2016 24.8544 17.9896C22.0823 16.4893 18.9997 18.6863 18.9997 21.558V30.292C18.9997 30.4921 19.0147 30.689 19.0435 30.8816C18.1348 30.9572 17.1239 31 15.9997 31C9.18851 31 6.53782 29.4282 5.57598 28.5242C5.06195 28.0411 5.00192 27.3824 5.1067 26.9004L6.83768 18.9378Z" fill="currentColor"></path><path d="M30.5172 25.0405C31.1605 25.4412 31.1605 26.4088 30.5172 26.8095L23.5048 31.1764C22.8901 31.5592 22.1202 31.1604 22.0124 30.4603C22.0041 30.4059 21.9997 30.3497 21.9997 30.292V21.558C21.9997 20.7563 22.8424 20.2611 23.5048 20.6736L30.5172 25.0405Z" fill="currentColor"></path></svg></span>0</span>
            </div>
        </a>
    </div>
</li>
                        </div>
            </ul>
            <a ng-click="loadMore()" class="btn btn-control-xs load-more-button ng-hide" ng-show="1 &gt; 6 * NumberOfVisibleRows">Load More</a>
        </div>
        <div id="games-switcher" class="switcher slide-switcher games ng-isolate-scope" ng-hide="isGridOn" switcher="" itemscount="switcher.games.itemsCount" currpage="switcher.games.currPage">
                        <ul class="slide-items-container switcher-items hlist">
                    <li class="switcher-item slide-item-container active" ng-class="{'active': switcher.games.currPage == 0}" data-index="0">
                        <div class="col-sm-6 slide-item-container-left">
                            <div class="slide-item-emblem-container">
                                
                            </div>
                        </div>
                        <div class="col-sm-6 slide-item-container-right games">
                            
                            
                        </div>
                    </li>
                        </ul>
        </div>
    </div>