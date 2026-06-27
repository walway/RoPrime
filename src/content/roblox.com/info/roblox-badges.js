(function() {
    'use strict';

if (/\/([a-z]{2})?\/roblox-badges/.test(window.location.pathname)) {
    
    const style = document.createElement('style');
    style.textContent = `div.request-error-page-content { display: none; }`
    document.head.appendChild(style)

document.querySelector('div.content').innerHTML = `
    <div id="badge-container" class="text badge-container">
        <h1>Badges</h1>
        
    <div class="stack">
        <h2>Membership Badges</h2>
        <ul class="stack-list">
            <li id="Badge18" class="divider-bottom stack-row">
                <div class="badge-image">
                    <img src="https://rbxcdn.com" alt="Welcome To The Club" width="75" height="75">
                </div>
                <div class="badge-description">
                    <h3>Welcome To The Club Badge</h3>
                    <p>This badge was awarded to users who had ever belonged to the illustrious Builders Club, which ran from 2007 to 2019. These people are part of a long tradition of Roblox greatness. It has been retired and is no longer attainable.</p>
                </div>
                <div style="clear: both"></div>
            </li>
        </ul>
    </div>

    <div class="stack">
        <h2>Group Badges</h2>
        <ul class="stack-list">
            <li id="Badge1" class="divider-bottom stack-row">
                <div class="badge-image">
                    <span class="icon-administrator" title="Administrator"></span>
                </div>
                <div class="badge-description">
                    <h3>Administrator Badge</h3>
                    <p>This badge identifies an account as belonging to a Roblox administrator. Only official Roblox administrators will possess this badge. If someone claims to be an admin, but does not have this badge, they are potentially trying to mislead you. If this happens, please report abuse and we will delete the imposter's account.</p>
                </div>
                <div style="clear: both"></div>
            </li>
            <li id="Badge12" class="divider-bottom stack-row">
                <div class="badge-image">
                    <img src="https://rbxcdn.com" alt="Veteran" width="75" height="75">
                </div>
                <div class="badge-description">
                    <h3>Veteran Badge</h3>
                    <p>This badge recognized members who had visited Roblox for one year or more. They are stalwart group members who have stuck with us over countless releases, and have helped shape Roblox into the experience that it is today. These medalists are the true steel, the core of the Robloxian history ... and its future. This badge could be earned from 2007 to 2026. It has been retired and is no longer attainable.</p>
                </div>
                <div style="clear: both"></div>
            </li>
            <li id="Badge2" class="divider-bottom stack-row">
                <div class="badge-image">
                    <img src="https://rbxcdn.com" alt="Friendship" width="75" height="75">
                </div>
                <div class="badge-description">
                    <h3>Friendship Badge</h3>
                    <p>This badge was given to members who embraced the Roblox group and made at least 20 friends. People who have this badge are good people to know and can probably help you out if you are having trouble. This badge could be earned from 2007 to 2026. It has been retired and is no longer attainable.</p>
                </div>
                <div style="clear: both"></div>
            </li>
            <li id="Badge14" class="divider-bottom stack-row">
                <div class="badge-image">
                    <img src="https://rbxcdn.com" alt="Ambassador" width="75" height="75">
                </div>
                <div class="badge-description">
                    <h3>Ambassador Badge</h3>
                    <p>This badge was awarded during the Ambassador Program, which ran from 2009 to 2012. It has been retired and is no longer attainable.</p>
                </div>
                <div style="clear: both"></div>
            </li>
            <li id="Badge8" class="divider-bottom stack-row">
                <div class="badge-image">
                    <img src="https://rbxcdn.com" alt="Inviter" width="75" height="75">
                </div>
                <div class="badge-description">
                    <h3>Inviter Badge</h3>
                    <p>This badge was awarded during the Inviter Program, which ran from 2009 to 2013. It has been retired and is no longer attainable.</p>
                </div>
                <div style="clear: both"></div>
            </li>
        </ul>
    </div>

    <div class="stack">
        <h2>Developer Badges</h2>
        <ul class="stack-list">
            <li id="Badge6" class="divider-bottom stack-row">
                <div class="badge-image">
                    <img src="https://rbxcdn.com" alt="Homestead" width="75" height="75">
                </div>
                <div class="badge-description">
                    <h3>Homestead Badge</h3>
                    <p>This badge was earned by having your personal place visited 100 times. People who achieved this have demonstrated their ability to build cool things that other Robloxians were interested enough in to check out. This badge could be earned from 2007 to 2026. It has been retired and is no longer attainable.</p>
                </div>
                <div style="clear: both"></div>
            </li>
            <li id="Badge7" class="divider-bottom stack-row">
                <div class="badge-image">
                    <img src="https://rbxcdn.com" alt="Bricksmith" width="75" height="75">
                </div>
                <div class="badge-description">
                    <h3>Bricksmith Badge</h3>
                    <p>This badge was earned by having a popular personal place. Once your place had been visited 1000 times, you received this award. Robloxians with Bricksmith badges are accomplished builders who were able to create a place that people wanted to explore a thousand times. They no doubt know a thing or two about putting bricks together. This badge could be earned from 2007 to 2026. It has been retired and is no longer attainable.</p>
                </div>
                <div style="clear: both"></div>
            </li>
            <li id="Badge17" class="divider-bottom stack-row">
                <div class="badge-image">
                    <img src="https://rbxcdn.com" alt="Official Model Maker" width="75" height="75">
                </div>
                <div class="badge-description">
                    <h3>Official Model Maker Badge</h3>
                    <p>This badge was awarded to members whose creations are so awesome, Roblox endorsed them. Owners of this badge probably have great scripting and building skills. It has been retired and is no longer attainable.</p>
                </div>
                <div style="clear: both"></div>
            </li>
        </ul>
    </div>

    <div class="stack">
        <h2>Gamer Badges</h2>
        <ul class="stack-list">
            <li id="Badge3" class="divider-bottom stack-row">
                <div class="badge-image">
                    <img src="https://rbxcdn.com" alt="Combat Initiation" width="75" height="75">
                </div>
                <div class="badge-description">
                    <h3>Combat Initiation Badge</h3>
                    <p>This badge was granted when a user scored 10 victories in experiences that use classic combat scripts. It was retired Summer 2015 and is no longer attainable.</p>
                </div>
                <div style="clear: both"></div>
            </li>
            <li id="Badge4" class="divider-bottom stack-row">
                <div class="badge-image">
                    <img src="https://rbxcdn.com" alt="Warrior" width="75" height="75">
                </div>
                <div class="badge-description">
                    <h3>Warrior Badge</h3>
                    <p>This badge was granted when a user scored 100 or more victories in experiences that use classic combat scripts. It was retired Summer 2015 and is no longer attainable.</p>
                </div>
                <div style="clear: both"></div>
            </li>
            <li id="Badge5" class="divider-bottom stack-row">
                <div class="badge-image">
                    <img src="https://rbxcdn.com" alt="Bloxxer" width="75" height="75">
                </div>
                <div class="badge-description">
                    <h3>Bloxxer Badge</h3>
                    <p>This badge was granted when a user scored at least 250 victories, and fewer than 250 wipeouts, in experiences that use classic combat scripts. It was retired Summer 2015 and is no longer attainable.</p>
                </div>
                <div style="clear: both"></div>
            </li>
        </ul>
    </div>
</div>
`; }
})();