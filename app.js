const {BotFrameworkAdapter, ConversationState, BotStateSet} = require("botbuilder");
const { CosmosDbStorage } = require("botbuilder-azure");
const restify = require("restify");
const {DialogSet, TextPrompt} = require("botbuilder-dialogs");

const dialogs = new DialogSet();

// Create server
let server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log(`${server.name} listening to ${server.url}`);
});

// Create adapter
const adapter = new BotFrameworkAdapter({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});


var cosmosDB = new CosmosDbStorage({
    serviceEndpoint: 'https://cashbot.table.cosmosdb.azure.com:443/',
    authKey: 'u5ZLZaSXllet4gKDKFEkZ9epGdfpMdB5GqfL0iFTXO8b074eYWeFf8gV8midHIjZe6kOMGocqsZ2B87kJkuIxQ==',
    databaseId: 'Tasks',
    collectionId: 'History'
});

// adapter.use({onTurn: async (context, next) =>{

//     // If the user types 'history' it should call the 3 previous logs in the DB
//     const utterance = (context.activity.text || '').trim().toLowerCase();
//     if(utterance.includes('history')){
//         await context.sendActivity('will look though the data');
//         var historyString = ""
//         // I want to read from the last 3 inputs
//         for(var i = num; i > num -3; i--){
//             var info = await cosmosDB.read([i.toString()]);
//             console.log('the info was', info);
//             historyString += `You said: ${info.message}`;
//         }

//         console.log('you said ', historyString)
//     }

//     else if(context.activity.type === "message"){

//         // build a log object to write to the database
//         var log = {
//             time: "",
//             message: "",
//             reply: ""
//         };

//         log.message = context.activity.text;
//         log.time = context.activity.localTimestamp;


//         //increment num and use it as a key in the DataBase
//         num ++
//         var key = num;
//         var obj = {};
//         obj[key] = log;
//         await cosmosDB.write(obj)

//     }

//     await next();            

// }})


// Using cosmosDb as the storage provider
const conversationState = new ConversationState(cosmosDB);
adapter.use(new BotStateSet(conversationState));

// Listen for incoming requests 
server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async (context) => {
        
        const isMessage = context.activity.type === 'message';
        const state = conversationState.get(context);
        const dc = dialogs.createContext(context, state);

        await dc.continue();

        if(!context.responded && isMessage){
            // var userInfo = 
            await dc.begin('greetings');

            // state.userInfo = {};
            // state.userInfo = userInfo; // Persisting state
        }
       
    });
});



// Greet user:
// Ask for the user name and then greet them by name.
// Ask them where they work.
dialogs.add('greetings',[
    async function (dc){
        // dc.activeDialog.state.userInfo = {};
        await dc.prompt('textPrompt', 'What is your name?');
    },
    async function(dc, userName){
        // dc.activeDialog.state.userInfo.userName = userName;
        await dc.context.sendActivity(`Hi ${userName}!`);

        // Ask them where they work
        await dc.prompt('textPrompt', 'Where do you work?');
    },
    async function(dc, workPlace){
        // dc.activeDialog.state.userInfo.workPlace = workPlace;
        await dc.context.sendActivity(`${workPlace} is a cool place!`);

        await dc.end(); //dc.activeDialog.state.userInfo
    }
]);

dialogs.add('textPrompt', new TextPrompt());