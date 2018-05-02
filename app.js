const { MemoryStorage } = require('botbuilder');
const botbuilder = require('botbuilder');
const restify = require('restify');
const {MessageFactory} = require('botbuilder');


const storage = new MemoryStorage();

// Create server
let server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log(`${server.name} listening to ${server.url}`);
});

// Create adapter (it's ok for MICROSOFT_APP_ID and MICROSOFT_APP_PASSWORD to be blank for now)  
const adapter = new botbuilder.BotFrameworkAdapter({ 
    appId: process.env.MICROSOFT_APP_ID, 
    appPassword: process.env.MICROSOFT_APP_PASSWORD 
});


// Listen for incoming activity 
server.post('/api/messages', (req, res) => {
    // Route received activity to adapter for processing
    adapter.processActivity(req, res, async (context) => {
        if (context.activity.type === 'message') {
            const utterances = (context.activity.text || '').trim().toLowerCase()
            if (utterances === 'subscribe') {
                const reference = context.activity;
                const userId = reference.id;
                const changes = {};
                changes['reference/' + userId] = reference;
                await storage.write(changes)
                await subscribeUser(userId)
                await context.sendActivity(`Thank You! We will message you shortly.`);
               
            } else{
                await context.sendActivity("Say 'subscribe'");
            }
    
        }
    });
});


async function subscribeUser(userId) {
    setTimeout(() => {
        createContextForUser(userId)
    }, 2000);
}

async function createContextForUser(userId, callback) {

    const reference = await findReference(userId);
    if (reference) {
        await adapter.continueConversation(reference, async (context) => {
           await context.sendActivity("coming back at you");
        });
        
     }
    // await callback(adapter.createContext(reference))
          
}

async function findReference(userId){
    const referenceKey = 'reference/' + userId;
    var rows = await storage.read([referenceKey])
    var reference = await rows[referenceKey]
    return reference;
}

