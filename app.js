const { BotFrameworkAdapter, MemoryStorage, ConversationState } = require('botbuilder');
const restify = require('restify');
const {DialogSet, TextPrompt, NumberPrompt, ChoicePrompt} = require("botbuilder-dialogs");
const dialogs = new DialogSet();
const { recognizeChoices } = require('botbuilder-choices');


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

// Add conversation state middleware
const conversationState = new ConversationState(new MemoryStorage());
adapter.use(conversationState);

// Listen for incoming requests 
server.post('/api/messages', (req, res) => {
    // Route received request to adapter for processing
    adapter.processActivity(req, res, async (context) => {
        if (context.activity.type === 'message') {
            const state = conversationState.get(context);
            const count = state.count === undefined ? state.count = 0 : ++state.count;
            const dc = dialogs.createContext(context, state);

            await dc.continue(); // Continue the current dialog if one is currently active

            if (!context.responded) {
                await dc.begin('greetings');
            }
        }
    });
});

// Greet user:
// Ask for the user name and then greet them by name.
// Ask them where they work.
dialogs.add('greetings',[
    async function (dc){
        await dc.prompt('numberPrompt', 'How many people in your party?', { retryPrompt: `Sorry, please specify the number of people in your party.` })
    },
    async function(dc, userName){
        await dc.context.sendActivity(`${userName} people!`);

        // Ask them where they work
        const list = ['green', 'blue'];
        await dc.prompt('choicePrompt', 'Please make a choice', list, {retryPrompt: 'Please choose a color.'});
    },
    async function(dc, color){
        await dc.context.sendActivity(`${color.value} is a cool place!`);
        await dc.begin('newGreeting');
        // await dc.end(color);
    }, async function(dc, name){
        await dc.context.sendActivity(`Your name is: ${name}`);
        await dc.end(name);
    }
]);

dialogs.add('newGreeting', [
    async function(dc){
        await dc.prompt('textPrompt', 'What is your name?')
    }, 
    async function(dc, name){
        await dc.end(name);
    }
])

dialogs.add('choicePrompt', new ChoicePrompt());
dialogs.add('textPrompt', new TextPrompt());
dialogs.add('numberPrompt', new NumberPrompt());