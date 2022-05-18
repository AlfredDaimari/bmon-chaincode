"use strict";

const { Contract } = require("fabric-contract-api");
const ClientIdentity = require("fabric-shim").ClientIdentity;

let users = {}          // will store usernames of users
let itemID = -1
let gameMakers = []     // clients that are allowed to make games using assets

/*

Game asset structure
{
    name:
    type: "currency" || "melee" || "ranged" || "siege" || "special"
    userID: ID or None
    url:
    value:
}

Asset sale:{
    name:
    type: "astforsale"
    asset_type:
    url:
    value:
    price:
}

Melee assets (sale price: X 100):

1 - geralt of rivia (10)        - 1000
2 - ciri of cintra  (9)         - 900
3 - letho of gulet  (6)         - 600
4 - zoltan chivay   (4)         - 400
5 - vernon roche    (5)         - 500

Ranged assets (sale price: X 100):
1 - keira metz              (6)
2 - sabrina glevissig       (5)
3 - yennefer of vengerberg  (7)
4 - merigold of meribor     (7)
5 - cynthia                 (10)

Siege assets (sale price: X 200):
1 - zerrikanian fire scorpion  (10)
2 - arachas behemoth           (6)
3 - siege technician           (6)
4 - rotten mangonel            (8)
5 - morvran voorhis            (8)

Special assets (sale price: 2000):
1 - biting frost
2 - impenetrable fog
3 - torrential rain
4 - scorch
5 - decoy


- x - x - x - x - x -

Request structure (for card and game-maker)
{
    userID:
    type: "assetreq" || "gmakereq"
    voters:[]
    info: (should be sent in JSON format):{
        name:
        type: "melee" || "ranged" || "siege" || "special"
        url:
        value:
    } or url,
    alias,
    status: "accepted" || "unaccepted"
}
- x - x - x - x - x -

- x - x - x - x - x -

Structure for game-maker info
{
    userID:
    type: "gmaker"
    info,
    alias,
    flaggers:[]
    status:"accepted" || "unaccepted"
}

- x - x - x - x - x -

- x - x - x - x - x -

Coin request structure:

{

userID,
type: "coinreq"
users: []   
wnr: (either user)
user1Items:
user2Items:
status: "accepted" || "unaccepted"

}

- x - x - x - x - x -


- x - x - x - x - x -

Trading request structure:

{
    cro:
    cro_usr:
    type: "tradereq"
    p2:
    p2_usr:
    p2_dec: // "yes, no, undecided"
    cro_items:[]
    p2_items:[]
    cro_items_info:[]       // separate coin
    p2_items_info:[]        // separate coin
    status: // trade status ("accepted" || "unaccepted")
}

- x - x - x - x - x -


Functions for marketplace:

- query my items
- query requests (game-maker and new card)
- query trading requests

- vote for requests (card, game-maker, flag)
- update trading request
- buy asset


Functions for gamemakers (frontend will search for members, then join them in game):
    - coin request, request
    - withing game for clients (update coin request)
*/



class FabChat extends Contract {

    // initialize ledger
    async initLedger(ctx) {
        console.info("============= START : Initialize Ledger ===========");

        const startKey = "0";
        const endKey = "999999";

        const iterator = await ctx.stub.getStateByRange(startKey, endKey);

        while (true) {
            const res = await iterator.next();

            if (res.value && res.value.value.toString()) {
                // console.log(res.value.value.toString('utf8'));
                let item;
                try {
                    item = JSON.parse(res.value.value.toString("utf8"));

                    itemID += 1;
                } catch (err) {
                    console.log(err);
                    item = res.value.value.toString("utf8");
                }
            }

            if (res.done) {
                await iterator.close();
                console.log(`users: ${users}`);
                console.log(`numUsers: ${users.length}`);
                console.log(`lastItemID: ${itemID}`);
                break;
            }
        }
        // add card sales
        let item = {}
        item.type = "astforsale"

        itemID += 1

        // all melee cards

        item.name = "geralt of rivia"
        item.value = 10
        item.asset_type = "melee"
        item.price = item.value * 100
        itemID += 1
        await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))

        item.name = "ciri of cintra"
        item.value = 9
        item.asset_type = "melee"
        item.price = item.value * 100
        itemID += 1
        await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))

        item.name = "letho of gulet"
        item.value = 6
        item.asset_type = "melee"
        item.price = item.value * 100
        itemID += 1
        await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))

        item.name = "zoltan chivay"
        item.value = 4
        item.asset_type = "melee"
        item.price = item.value * 100
        itemID += 1
        await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))

        item.name = "vernon roche"
        item.value = 4
        item.asset_type = "melee"
        item.price = item.value * 100
        itemID += 5
        await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))


        // all ranged cards

        item.name = "keira metz"
        item.value = 6
        item.asset_type = "ranged"
        item.price = item.value * 100
        itemID += 1
        await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))

        item.name = "sabrina glevissig"
        item.value = 5
        item.asset_type = "ranged"
        item.price = item.value * 100
        itemID += 1
        await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))

        item.name = "yennefer of vengerberg"
        item.value = 7
        item.asset_type = "ranged"
        item.price = item.value * 100
        itemID += 1
        await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))

        item.name = "merigold of meribor"
        item.value = 7
        item.asset_type = "ranged"
        item.price = item.value * 100
        itemID += 1
        await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))

        item.name = "cynthia"
        item.value = 10
        item.asset_type = "ranged"
        item.price = item.value * 100
        itemID += 1
        await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))


        // all siege cards

        item.name = "zerrikanian fire scorpion"
        item.value = 10
        item.asset_type = "siege"
        item.price = item.value * 200
        itemID += 1
        await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))

        item.name = "arachas behemoth"
        item.value = 6
        item.asset_type = "siege"
        item.price = item.value * 200
        itemID += 1
        await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))

        item.name = "siege technician"
        item.value = 6
        item.asset_type = "siege"
        item.price = item.value * 200
        itemID += 1
        await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))

        item.name = "rotten mangonel"
        item.value = 8
        item.asset_type = "siege"
        item.price = item.value * 200
        itemID += 1
        await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))

        item.name = "morvran voorhis"
        item.value = 8
        item.asset_type = "siege"
        item.price = item.value * 200
        itemID += 1
        await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))



        // all special cards
        item.name = "bitting frost"
        item.value = 0
        item.asset_type = "special"
        item.price = 2000
        itemID += 1
        await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))

        item.name = "impenetrable fog"
        item.value = 0
        item.asset_type = "special"
        item.price = 2000
        itemID += 1
        await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))

        item.name = "torrential rain"
        item.value = 0
        item.asset_type = "special"
        item.price = 2000
        itemID += 1
        await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))

        item.name = "scorch"
        item.value = 0
        item.asset_type = "special"
        item.price = 2000
        itemID += 1
        await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))

        item.name = "decoy"
        item.value = 0
        item.asset_type = "special"
        item.price = 2000
        itemID += 1
        await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))

        console.info("============= END : Initialize Ledger ===========");
    }


    // Give new user a starting deck, add to user dictionary
    async hello(ctx, username) {
        console.info("============= START : Hello ===========");

        let cid = new ClientIdentity(ctx.stub);
        let userID = cid.getID();

        // if new user, add user to users array
        if (!users[username]) {

            if (!Object.values(users).includes(userID)) {
                console.log(`New user ${username} added to user dictionary.`);
                users[username] = userID;

                let item = {}
                item.userID = userID;   // setting user ID for all cards



                // two cards from melee

                item.name = "zoltan chivay";
                item.type = "melee";
                //item.url = ""
                item.value = 4;
                itemID += 1
                await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))

                item.name = "vernon roche";
                item.type = "melee";
                //item.url = ""
                item.value = 5;
                itemID += 1
                await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))



                // three cards from ranged

                item.name = "keira metz";
                item.type = "ranged";
                //item.url = ""
                item.value = 6;
                itemID += 1
                await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))

                item.name = "sabrina glessivig";
                item.type = "ranged";
                //item.url = ""
                item.value = 5;
                itemID += 1
                await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))

                item.name = "yennefer of vengerberg";
                item.type = "ranged";
                item.userID = userID;
                //item.url = ""
                item.value = 7;
                itemID += 1
                await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))



                // two cards from siege

                item.name = "arachas behemoth";
                item.type = "siege";
                //item.url = ""
                item.value = 6;
                itemID += 1
                await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))

                item.name = "siege technician";
                item.type = "siege";
                //item.url = ""
                item.value = 6;
                itemID += 1
                await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))



                // three cards from special

                item.name = "biting frost";
                item.type = "special";
                //item.url = ""
                item.value = 10;
                itemID += 1
                await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))

                item.name = "impenetrable fog";
                item.type = "special";
                //item.url = ""
                item.value = 10;
                itemID += 1
                await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))

                item.name = "torrential rain";
                item.type = "special";
                //item.url = ""
                item.value = 0;
                itemID += 1
                await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))

                for (let i = 0; i < 500; i++) {
                    item.name = "floren";
                    item.type = "currency";
                    //item.url = ""
                    item.value = 1;

                    itemID += 1
                    await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(item)))
                }

                console.log(users)
                console.info("============= END : Hello ===========");
                return "Success:Username added"

            } else {
                console.log(`User already exists with different username`)
                console.info("============= END : Hello ===========");
                return "Error:User already exists with different username"
            }

        } else {
            console.log(`${username} is already taken.`)
            console.info("============= END : Hello ===========");
            return "Error:Username already exists"
        }
    }


    // to query an item that the user owns
    async queryItem(ctx, itemIDt) {
        console.info("============= START : queryItem ===========");

        let cid = new ClientIdentity(ctx.stub);
        let userID = cid.getID();

        const itemAsBytes = await ctx.stub.getState(itemIDt); // get the item from chaincode state
        if (!itemAsBytes || itemAsBytes.length === 0) {
            throw new Error(`${itemIDt} does not exist`);
        }
        const item = JSON.parse(itemAsBytes.toString());

        if (item.userID == userID) {
            console.info("============= END : queryItem ===========");
            return [item]
        }
        console.info("============= END : queryItem ===========");
        return []       // not returning data if user is not the creator
    }

    // only for dev (testing)
    async queryAllItems(ctx) {
        console.info("============= START : queryAllItems ===========");

        const startKey = "0";
        const endKey = "999999";

        const iterator = await ctx.stub.getStateByRange(startKey, endKey);

        const allResults = [];
        while (true) {
            const res = await iterator.next();

            if (res.value && res.value.value.toString()) {
                // console.log(res.value.value.toString('utf8'));

                const Key = res.value.key;
                let item;
                try {
                    item = JSON.parse(res.value.value.toString("utf8"));
                } catch (err) {
                    console.log(err);
                    item = res.value.value.toString("utf8");
                }
                allResults.push({ Key, item });
            }
            if (res.done) {
                await iterator.close();
                console.info(allResults);
                console.info("============= END : queryAllItems ===========");
                return JSON.stringify(allResults);
            }
        }
    }

    // queryAssets - for buying cards
    async queryAssets(ctx) {
        console.info("============= START : queryAssets ===========");

        const startKey = "0";
        const endKey = "999999";

        const iterator = await ctx.stub.getStateByRange(startKey, endKey);
        const allResults = [];
        while (true) {
            const res = await iterator.next();

            if (res.value && res.value.value.toString()) {
                // console.log(res.value.value.toString('utf8'));

                const Key = res.value.key;
                let item;
                try {
                    item = JSON.parse(res.value.value.toString("utf8"));
                } catch (err) {
                    console.log(err);
                    item = res.value.value.toString("utf8");
                }

                // only sending the  user items
                if (item.type == "astforsale") {
                    delete item.userID
                    allResults.push({ Key, item });
                }
            }

            if (res.done) {
                await iterator.close();
                console.info(allResults);
                console.info("============= END : queryAssets ===========");
                return JSON.stringify(allResults);
            }
        }
    }

    // For querying all items of user
    async queryMyItems(ctx) {
        console.info("============= START : queryMyItems ===========");

        let cid = new ClientIdentity(ctx.stub);
        let userID = cid.getID();

        const startKey = "0";
        const endKey = "999999";

        const iterator = await ctx.stub.getStateByRange(startKey, endKey);
        const allResults = [];
        while (true) {
            const res = await iterator.next();

            if (res.value && res.value.value.toString()) {
                // console.log(res.value.value.toString('utf8'));

                const Key = res.value.key;
                let item;
                try {
                    item = JSON.parse(res.value.value.toString("utf8"));
                } catch (err) {
                    console.log(err);
                    item = res.value.value.toString("utf8");
                }

                // only sending the  user items
                let asset = item.type == "assetreq" || item.type == "gmaker" || item.type == "gmakereq" || item.type == "coinreq" ? false : true;
                if (item.userID == userID && asset) {
                    delete item.userID
                    allResults.push({ Key, item });
                }
            }

            if (res.done) {
                await iterator.close();
                console.info(allResults);
                console.info("============= END : queryMyItems ===========");
                return JSON.stringify(allResults);
            }
        }
    }

    // For querying game-maker requests, card requests, gmaker (will be part of democracy tab)
    async queryRequests(ctx) {
        console.info("============= START : queryRequests ===========");
        const startKey = "0";
        const endKey = "999999";

        const iterator = await ctx.stub.getStateByRange(startKey, endKey);
        const allResults = [];
        while (true) {
            const res = await iterator.next();

            if (res.value && res.value.value.toString()) {
                // console.log(res.value.value.toString('utf8'));

                const Key = res.value.key;
                let item;
                try {
                    item = JSON.parse(res.value.value.toString("utf8"));
                } catch (err) {
                    console.log(err);
                    item = res.value.value.toString("utf8");
                }

                // only sending the  user items
                if (item.type == "assetreq" || item.type == "gmakereq" || item.type == "gmaker") {
                    delete item.userID
                    delete item.voters
                    delete item.flaggers
                    allResults.push({ Key, item });
                }
            }

            if (res.done) {
                await iterator.close();
                console.info(allResults);
                console.info("============= END : queryRequests ===========");
                return JSON.stringify(allResults);
            }
        }
    }


    // For querying every trading request
    async queryTradeRequests(ctx) {
        console.info("============= START : queryTradingRequest ===========");

        let cid = new ClientIdentity(ctx.stub);
        let userID = cid.getID();

        const startKey = "0";
        const endKey = "999999";

        const iterator = await ctx.stub.getStateByRange(startKey, endKey);
        const allResults = [];
        while (true) {
            const res = await iterator.next();

            if (res.value && res.value.value.toString()) {
                // console.log(res.value.value.toString('utf8'));

                const Key = res.value.key;
                let item;
                try {
                    item = JSON.parse(res.value.value.toString("utf8"));
                } catch (err) {
                    console.log(err);
                    item = res.value.value.toString("utf8");
                }

                // only sending the  user items
                if (item.cro == userID || item.p2 == userID) {
                    delete item.cro
                    delete item.p2
                    allResults.push({ Key, item });
                }
            }

            if (res.done) {
                await iterator.close();
                console.info(allResults);
                console.info("============= END : queryTradingRequest ===========");
                return JSON.stringify(allResults);
            }
        }
    }


    //  request for asset or game-maker, will be reserved for game-maker
    async request(ctx, type, info, alias) {
        console.info("============= START : request (Asset or Game-Maker) ===========");

        let cid = new ClientIdentity(ctx.stub);
        let userID = cid.getID();

        let item;
        info = JSON.parse(info);

        item = {
            userID,
            info,
            status: "unaccepted",
            voters: [],
            alias
        }

        item.type = type == "gmakereq" ? "gmakereq" : "assetreq"
        console.log(item)
        if (type == "assetreq" && !gameMakers.includes(userID)) {
            throw new Error(`Error - ${userID} is not a game maker.`)
        }

        itemID += 1
        await ctx.stub.putState(
            itemID.toString(),
            Buffer.from(JSON.stringify(item)))

        console.info("============= END : request (Asset or Game-Maker) ===========");
    }


    // For coin request, only for gamemaker (gamemaker gets 7 coins, winner gets 3 coins for playing, loser gets 3 coins for playing)
    async coinRequest(ctx, user0, user1) {

        console.info("============= START : coinRequest ===========");

        let cid = new ClientIdentity(ctx.stub);
        let userID = cid.getID();
        if (!gameMakers.includes(userID)) {
            throw new Error(`Error - ${userID} is not a game maker.`)
        }

        if (users[user0] && users[user1]) {
            let item = {
                userID,
                type: "coinreq",
                users: [users[user0], users[user1]],
                wnr: "None",
                user0Items: false,       // will be updated by user0
                user1Items: false,       // will be updated by user1
                status: "unaccepted",  // reward given out or not
            }

            itemID += 1
            await ctx.stub.putState(
                itemID.toString(),
                Buffer.from(JSON.stringify(item)))

            console.info("============= END : coinRequest ===========");
            return itemID.toString()        // returning coinRequestID to update the winner and loser

        } else {
            console.info("============= END : coinRequest ===========");
            return "Error: Users do not exist"
        }
    }


    // function to add what user wants to stake on
    async stakeCoinRequest(ctx, itemIDt, userItems) {
        console.info("============= START : stakeCoinRequest ===========");

        let cid = new ClientIdentity(ctx.stub);
        let userID = cid.getID();

        const itemAsBytes = await ctx.stub.getState(itemIDt); // get the item from chaincode state
        if (!itemAsBytes || itemAsBytes.length === 0) {
            throw new Error(`${itemIDt} does not exist`);
        }
        const item = JSON.parse(itemAsBytes.toString());
        if (!item.users.includes(userID)) {

            console.info("Error:No permision")
            console.info("============= END : stakeCoinRequest ===========");

            return "Error:user does not have permission to stake on this request"
        }

        if (item.users[0] == userID && item.user0Items == false) {
            item.user0Items = JSON.parse(userItems)
        }

        if (item.users[1] == userID && item.user1Items == false) {
            item.user1Items = JSON.parse(userItems)
        }
        console.log("After update: ", JSON.stringify(item))

        await ctx.stub.putState(itemIDt, Buffer.from(JSON.stringify(item)));

        console.info("============= END : stakeCoinRequest ===========");

    }


    // for creating a new trade request

    async tradeRequest(ctx, username, cro_items, p2_items) {
        console.info("============= START : tradeRequest ===========");

        let cid = new ClientIdentity(ctx.stub);
        let userID = cid.getID();

        const usernames = Object.keys(users)
        const ids = Object.values(users)
        const index = ids.findIndex(value => value == userID)

        cro_items = JSON.parse(cro_items)
        p2_items = JSON.parse(p2_items)
        let cro_items_info = []
        let p2_items_info = []

        for (let i of cro_items) {
            const itemAsBytes = await ctx.stub.getState(i); // get the item from chaincode state
            if (!itemAsBytes || itemAsBytes.length === 0) {
                throw new Error(`${itemIDt} does not exist`);
            }
            let itemT;
            itemT = JSON.parse(itemAsBytes.toString());
            if (itemT.type != "currency") {
                delete itemT.userID
                cro_items_info.push({ "Key": i, "item": itemT });
            }
        }

        for (let i of p2_items) {
            const itemAsBytes = await ctx.stub.getState(i); // get the item from chaincode state
            if (!itemAsBytes || itemAsBytes.length === 0) {
                throw new Error(`${itemIDt} does not exist`);
            }
            let itemT;
            itemT = JSON.parse(itemAsBytes.toString());
            if (itemT.type != "currency") {
                delete itemT.userID
                p2_items_info.push({ "Key": i, "item": itemT });
            }
        }

        let item = {
            cro: userID,
            cro_usr: usernames[index],
            type: "tradereq",
            p2: users[username],
            p2_usr: username,
            cro_items,
            p2_items,
            cro_items_info,
            p2_items_info,
            p2_dec: "undecided",
            status: "unaccepted"
        }

        console.log(item)

        itemID += 1;
        await ctx.stub.putState(
            itemID.toString(),
            Buffer.from(JSON.stringify(item)))


        console.info("============= END : tradeRequest ===========");
    }



    // for voting: assetreq, gmakereq and flagging gmaker

    async voteForRequest(ctx, itemIDt) {

        console.info("============= START : voteForRequest ===========");
        console.log(`itemID: ${itemIDt}`);

        let cid = new ClientIdentity(ctx.stub);
        let userID = cid.getID();

        const itemAsBytes = await ctx.stub.getState(itemIDt); // get the item from chaincode state
        if (!itemAsBytes || itemAsBytes.length === 0) {
            throw new Error(`${itemIDt} does not exist`);
        }
        let item;
        item = JSON.parse(itemAsBytes.toString());

        if (item.type != "gmaker" && item.status == "unaccepted") {

            if (!item.voters.includes(userID)) {
                item.voters.push(userID);
                console.log(item.voters)
            } else {
                throw new Error(`${userID} already voted.`)
            }


            if (item.voters.length >= Math.ceil(Object.values(users).length * 0.5)) {

                item.status = "accepted"
                let itemK;

                if (item.type == "assetreq") {
                    const asset = item.info
                    itemK = {
                        name: asset.name,
                        value: asset.value,
                        type: asset.type,
                        //url: asset.url,
                        price: Math.max(asset.value * 400, 400)
                    }
                }

                if (item.type == "gmakereq") {
                    if (!gameMakers.includes(item.userID)) {
                        gameMakers.push(item.userID)
                    }

                    itemK = {
                        userID: item.userID,
                        type: "gmaker",
                        flaggers: [],
                        info: item.info,
                        status: "unaccepted",
                        alias: item.alias
                    }

                    console.log(gameMakers)
                }

                console.log(itemK)
                itemID += 1
                await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(itemK)));
            }

            await ctx.stub.putState(itemIDt, Buffer.from(JSON.stringify(item)));
            console.info("============= END : voteForRequest ===========");

        } else if (item.type == "gmaker") {

            item.flaggers.push(userID);

            if (item.flaggers.length >= Math.ceil(Object.values(users).length * 0.5)) {
                gameMakers = gameMakers.filter(value => value != item.userID);
                console.log(gameMakers)
                item.status = "accepted"
            }

            await ctx.stub.putState(itemIDt, Buffer.from(JSON.stringify(item)));
            console.info("============= END : voteForRequest ===========");

        } else {
            throw new Error(`Request ${itemIDt} cannot be voted upon.`)
        }

    }


    //For updating both coin and trading request (wto - winner of coin request or user to trade to)

    async updateRequest(ctx, itemIDt, wto, decision) {
        console.info("============= START : updateRequest ===========");

        let cid = new ClientIdentity(ctx.stub);
        let userID = cid.getID();

        const itemAsBytes = await ctx.stub.getState(itemIDt); // get the item from chaincode state
        if (!itemAsBytes || itemAsBytes.length === 0) {
            throw new Error(`${itemIDt} does not exist`);
        }

        let item;
        item = JSON.parse(itemAsBytes.toString());

        if (item.type == "coinreq" && userID == item.userID && item.status == "unaccepted") {

            if (item.user0Items === false || item.user1Items === false) {
                throw new Error("Users have not staked their assets")
            }

            let user0 = item.users[0]
            let user1 = item.users[1]

            if (item.users.includes(users[wto])) {
                item.wnr = users[wto]
            } else {
                throw new Error(`${wto} not in users`)
            }

            let itemM;

            itemM = {}
            itemM.name = "floren";
            itemM.type = "currency";
            itemM.userID = userID;
            item.value = 1;


            // first rewarding the gamemaker for provding gaming services
            for (let i = 0; i < 2; i++) {
                itemID += 1
                await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(itemM)))
            }


            // then rewarding the user for winning
            itemM.userID = users[wto]
            for (let i = 0; i < 7; i++) {
                itemID += 1
                await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(itemM)))
            }

            // checking if loser has all items
            let loser = user0 != users[wto] ? user0 : user1
            let loserItems = user0 != users[wto] ? item.user0Items : item.user1Items

            let check = true
            for (let i of loserItems) {
                const itemAsBytes = await ctx.stub.getState(i.toString()); // get the item from chaincode state
                if (!itemAsBytes || itemAsBytes.length === 0) {
                    check = false
                    console.log(`${i} item does not exist`)
                    break;
                }

                let itemK;
                itemK = JSON.parse(itemAsBytes.toString());

                if (itemK.userID != loser) {
                    console.log(`${i} not owned by loser ${user0}`)
                    check = false
                    break;
                }

            }

            if (!check) {
                // if loser doesn't have assets, punish the loser, give winner the coins
                for (let i = 0; i < 3; i++) {
                    itemID += 1
                    await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(itemM)))
                }
            } else {
                // give loser the coins
                itemM.userID = loser
                for (let i = 0; i < 3; i++) {
                    itemID += 1
                    await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(itemM)))
                }

                // transfer loser assets to winner
                for (let i of loserItems) {
                    const itemAsBytes = await ctx.stub.getState(i.toString());
                    let itemK;
                    itemK = JSON.parse(itemAsBytes.toString());
                    itemK.userID = item.wnr
                    await ctx.stub.putState(i.toString(), Buffer.from(JSON.stringify(itemK)));
                }

            }

            item.status = "accepted"
            await ctx.stub.putState(itemIDt, Buffer.from(JSON.stringify(item)));
        }

        if (item.type == "tradereq") {
            // checking decision
            console.log(`Decision by ${item.p2_usr} is ${decision}`)

            if (decision == "no" && userID == item.p2 && item.status == "unaccepted") {
                item.p2_dec = decision;
                item.status = "accepted";
                await ctx.stub.putState(itemIDt, Buffer.from(JSON.stringify(item)));
            }

            if (decision == "yes" && userID == item.p2 && item.status == "unaccepted") {
                // check if both the users still have both the assets
                let check = true
                console.log("===== Changing ownership of assets =====")

                for (let i of item.cro_items) {

                    const itemAsBytes = await ctx.stub.getState(i.toString()); // get the item from chaincode state
                    if (!itemAsBytes || itemAsBytes.length === 0) {
                        check = false
                        console.log(`${i} item does not exist`)
                        break;
                    }

                    let itemK;
                    itemK = JSON.parse(itemAsBytes.toString());
                    if (itemK.userID != item.cro) {
                        check = false
                        console.log(`${i} not owned by ${item.cro}`)
                        break;
                    }

                }

                for (let i of item.p2_items) {
                    const itemAsBytes = await ctx.stub.getState(i.toString()); // get the item from chaincode state
                    if (!itemAsBytes || itemAsBytes.length === 0) {
                        check = false
                        console.log(`${i} item does not exist`)
                        break;
                    }

                    let itemK;
                    itemK = JSON.parse(itemAsBytes.toString());

                    if (itemK.userID != item.p2) {
                        console.log(`${i} not owned by ${item.p2}`)
                        check = false
                        break;
                    }

                }

                item.status = "accepted";
                item.p2_dec = check ? "yes" : "no";
                await ctx.stub.putState(itemIDt, Buffer.from(JSON.stringify(item)));

                if (!check) {
                    console.log(`Items are not owned by ${item.p2_usr} and ${item.cro_usr}`)
                    return "Error:Item not owned by user"
                }

                // transfer and switch items between both users
                for (let i of item.cro_items) {
                    const itemAsBytes = await ctx.stub.getState(i.toString());
                    let itemK;
                    itemK = JSON.parse(itemAsBytes.toString());
                    itemK.userID = item.p2
                    await ctx.stub.putState(i.toString(), Buffer.from(JSON.stringify(itemK)));
                }

                for (let i of item.p2_items) {
                    const itemAsBytes = await ctx.stub.getState(i.toString());
                    let itemK;
                    itemK = JSON.parse(itemAsBytes.toString());
                    itemK.userID = item.cro
                    await ctx.stub.putState(i.toString(), Buffer.from(JSON.stringify(itemK)));
                }

            }

        }

        console.info("============= END : updateRequest ===========");
    }

    // for buying Assets
    async buyAsset(ctx, itemIDt, coins) {
        console.info("============= START : buyAsset ===========");

        let cid = new ClientIdentity(ctx.stub);
        let userID = cid.getID();


        const itemAsBytes = await ctx.stub.getState(itemIDt.toString()); // get the item from chaincode state
        if (!itemAsBytes || itemAsBytes.length === 0) {
            throw new Error(`${itemIDt} does not exist`);
        }

        let item;
        item = JSON.parse(itemAsBytes.toString());

        coins = JSON.parse(coins)

        if (coins.length < item.price) {
            console.info("============= END : buyAsset ===========");
            return "Error:Not enough money!"
        }

        // checking if user owns all the coins
        for (let i of coins) {
            const itemAsBytesT = await ctx.stub.getState(i.toString()); // get the item from chaincode state
            if (!itemAsBytesT || itemAsBytesT.length === 0) {
                throw new Error(`${i} does not exist`);
            }
            let itemT;
            itemT = JSON.parse(itemAsBytesT.toString());

            if (itemT.userID != userID || itemT.type != "currency") {
                console.info("============= END : buyAsset ===========")
                return "Error:User does not own assets"
            }

        }

        let itemK = {
            userID,
            name: item.name,
            value: item.value,
            type: item.asset_type
            //url: item.url
        }


        // transferring asset to user
        itemID += 1
        console.log(itemK)
        await ctx.stub.putState(itemID.toString(), Buffer.from(JSON.stringify(itemK)))

        // destroying the coins
        for (let i of coins) {
            const itemAsBytesT = await ctx.stub.getState(i.toString()); // get the item from chaincode state

            if (!itemAsBytesT || itemAsBytesT.length === 0) {
                throw new Error(`${i} does not exist`);
            }

            let itemT;
            itemT = JSON.parse(itemAsBytesT.toString());
            itemT.userID = "None"
            await ctx.stub.putState(i.toString(), Buffer.from(JSON.stringify(itemT)))

        }

        console.info("============= END : buyAsset ===========");
    }

}



module.exports = FabChat;