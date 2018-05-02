const {BotFrameworkAdapter, FileStorage, ConversationState, UserState, BotStateSet, 
    MessageFactory, NumberPrompt, TextPrompt, DatetimePrompt } = require("botbuilder");
const {DialogSet} = require("botbuilder-dialogs");
const restify = require("restify");

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

// Storage
const storage = new FileStorage("c:/temp");
const convoState = new ConversationState(storage);
const userState  = new UserState(storage);
adapter.use(new BotStateSet(convoState, userState));

// Create empty dialog set
const dialogs = new DialogSet();

// Listen for incoming activity 
server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async (context) => {
        const isMessage = (context.activity.type === 'message');
        // State will store all of your information 
        const convo = conversationState.get(context);
        const dc = dialogs.createContext(context, state);

        if (isMessage) {
            // Check for valid intents
            if(context.activity.text.match(/hi/ig)){
                await dc.begin('greeting');
            }
            else if(context.activity.text.match(/reserve table/ig)){
                await dc.begin('reserveTable');
            }
        }

        if(!context.responded){
            // Continue executing the "current" dialog, if any.
            await dc.continue();

            if(!context.responded && isMessage){
                // Default message
                await context.sendActivity("Hi! I'm a simple bot. Please say 'Hi' or 'Reserve table'.");
            }
        }
    });
});

// Define dialogs

// Greet user by name:
// Ask for the user name and then greet them by name.
dialogs.add('greeting',[
    async function (dc){
        dc.currentDialog.state = {};
        await dc.prompt('textPrompt', 'Hi! What is your name?');
    },
    async function(dc, results){
        dc.currentDialog.state.userName = results;
        await dc.context.sendActivity(`Hello ${dc.currentDialog.state.userName}!`);
        await dc.prompt('textPrompt', 'Where do you work?');
    },
    async function(dc, results){
        dc.currentDialog.state.workPlace = results;
        await dc.context.sendActivity(`${dc.currentDialog.state.workPlace} is a fun place to work.`);
        await dc.end(); // Ends the dialog
    }
]);

// Define prompts
// Generic prompts
dialogs.add('numberPrompt', new NumberPrompt());
dialogs.add('textPrompt', new TextPrompt());
dialogs.add('dateTimePrompt', new DatetimePrompt());
dialogs.add('partySizePrompt', new NumberPrompt());

// Reserve a table:
// Help the user to reserve a table

dialogs.add('reserveTable', [
    async function(dc, args, next){
        await dc.context.sendActivity("Welcome to the reservation service.");

        dc.currentDialog.state.reservationInfo = {}; // Clears any previous data
        await dc.prompt('dateTimePrompt', "Please provide a reservation date and time.");
    },
    async function(dc, result){
        dc.currentDialog.state.reservationInfo.dateTime = result[0].value;

        // Ask for next info
        await dc.prompt('partySizePrompt', "How many people are in your party?");
    },
    async function(dc, result){
        dc.currentDialog.state.reservationInfo.partySize = result;

        // Ask for next info
        await dc.prompt('textPrompt', "Who's name will this be under?");
    },
    async function(dc, result){
        dc.currentDialog.state.reservationInfo.reserveName = result;
        
        // Persist data
        var convo = convoState.get(dc.context);; // conversationState.get(dc.context);
        convo.reservationInfo = dc.currentDialog.state.reservationInfo;

        // Confirm reservation
        var msg = `Reservation confirmed. Reservation details: 
            <br/>Date/Time: ${dc.currentDialog.state.reservationInfo.dateTime} 
            <br/>Party size: ${dc.currentDialog.state.reservationInfo.partySize} 
            <br/>Reservation name: ${dc.currentDialog.state.reservationInfo.reserveName}`;
        await dc.context.sendActivity(msg);
        await dc.end();
    }
]);
