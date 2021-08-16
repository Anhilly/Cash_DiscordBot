const { Console } = require('console');
const{Client, Intents} = require('discord.js');
const fs = require('fs');
const config = require("../config.json");

const intents = new Intents(32767);
const client = new Client({intents: intents});

const userMap = new Map();

let logFile = "log.txt"

client.login(config.token);
/**
 * Removes all the unnecessary data from the user ID
 * @param {*} msg the unfilterd id
 * @returns the correct user id
 */
function stripMessageForID(msg){
    msg = msg.split('>')[0]
    msg = msg.replace(/\D+/gm, '');

    return msg;
}

/**
 * Turns the userList(Object Array) to a simple string array through appending the strings
 * @returns the new String array
 */
function objectArrayToString(){
    let strArrUL = "";
    const sortedMap = new Map([...userMap.entries()].sort((a, b) => b[1] - a[1]));
    for (let [key, value] of  sortedMap.entries()) {
        strArrUL = strArrUL.concat("||", "User: ",key, ", Price: ", value.toString(), "\n")
    }

    return strArrUL;
}

/**
 * Writes the string array to file
 */
function updateFile(){
    fs.writeFile(logFile, objectArrayToString(), (err) => {
        if (err)
          console.log(err);
        else {
          console.log("File written successfully");
        }
    });

}

/**
 * Reads the logfile and adds the Data to the userList
 */
function readUserList(){
    fs.readFile(logFile, 'utf8', (err, data) => {
        if (err) {
            console.log("Unable to read file, created new file")
            updateFile();
        }else{
            users = data.split('||')

            for(let i = 1; i < users.length; i++){
                users[i] = users[i].replace("Price: ", "");           
                let nameAndPrice = users[i].split(",");
                nameAndPrice[0] = nameAndPrice[0].replace("User: ", "");
                //userList.push({user: nameAndPrice[0], price: parseInt(nameAndPrice[1])})
                userMap.set(nameAndPrice[0], parseFloat(nameAndPrice[1]))
            } 
            updateFile();
        }
    })
}

/**
 * Updates the Data of a user and write everything to file.
 */
function updateData(usertag, type, amount){
    if(typeof usertag === "undefined") return
    updateUserList(usertag, type, amount);
    updateFile();
}

/**
 * Updates the userList and prices for a specific user defined by his usertag.
 * @param {} usertag The usertag of the user
 */
function updateUserList(usertag, type, amount){
        if(type === "pay" && !isNaN(amount)) userMap.set(usertag, userMap.has(usertag) ? userMap.get(usertag) + amount : amount);
        else if(type === "paid") userMap.set(usertag,userMap.has(usertag) ? userMap.get(usertag) - amount : -amount);
        else userMap.set(usertag, parseFloat("0.25"));
}

/**
 * Finds the Usertag for a given userID
 * @param {} userID 
 */
function findUsertagToID(userID, message){
    id = stripMessageForID(userID)
    
    if(id.length > 5) {
        if(typeof client.users.cache.find(u => u.id === id) === "undefined"){
            message.reply("Bitte benutze einen anderen User...");
        } else {
            return client.users.cache.find(u => u.id === id).tag;
        }
    } else message.reply("Bitte benutze einen anderen User...");
}

client.on('ready', () => {
    console.log(`${client.user.username}`, "is online")
    readUserList();
})

client.on('messageCreate', (message) => {
    if(!message.content.startsWith(config.prefix)) return;

    const args = message.content.substring(config.prefix.length).split(/ +/);

    switch(args[0]){
        case "pay":
            if(args.length === 1) { message.reply("Bitte gib an wer bezahlen muss mit !pay @username"); break;};
            usertag = findUsertagToID(args[1], message);
            if(args.length === 2) updateData(usertag, "pay", parseFloat("0.25"));
            else if(args.length === 3) updateData(usertag, "pay", parseFloat(args[2]));
            break;
        case "paid":
            if(args.length <= 2) {message.reply("Bitte gib an wer bezahlt hat und wie viel mit !paid @username amount"); break;}
            updateData(findUsertagToID(args[1], message), "paid", parseFloat(args[2]));
            break;
        case "list":
            let str = objectArrayToString();
            while(str.indexOf("||") > -1){
                str = str.replace("||", "");
            }
            let sum = 0;
            userMap.forEach((value) => {sum += value})
            let sumString = "\n --------------------------------------------" + "\n Gesamt: " + sum;
            if(str.length > 0) message.reply(str + sumString)
            else message.reply("Noch niemand in der Liste :)")
            break;
        case "info":
            infoText = "Befehle: \n "+ config.prefix+"pay @username - @username muss 0.25€ bezahlen | z.B. "+config.prefix+"pay @Anton#3479 \n "+config.prefix+"pay @username zahl - @username muss zahl bezahlen | z.B. "+config.prefix+"pay @Anton#3479 1.25 \n "+config.prefix+"paid @username zahl - @username hat zahl bezahlt | z.B. "+config.prefix+"paid @Anton#3479 1.25 \n "+config.prefix+"list - Um einen Überblick über den Strafenkatalog zu erhalten";
            message.reply(infoText)
            break;
    }
})