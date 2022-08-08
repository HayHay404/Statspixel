import dotenv from "dotenv"
import path from "path" // We need this above to get the path to the .env file

// Best practice (imo) to put this at the top of the file. Incase any imports needs to access .env
dotenv.config({path: path.resolve(__dirname, '..', '.env')})

import axios from "axios"
import tmi from "tmi.js"

const client = tmi.Client({
    options: {
        clientId: process.env["CLIENT_ID"],
        debug: process.env.NODE_ENV === 'development' // Sets to true if the NODE_ENV environment variable is set to 'development'
    },
    identity: {
        username: "Statspixel", // hehe should be Statspixwl
        password: process.env["CLIENT_OAUTH"] as string,
    },
    channels: ["HayHayIsLive", "Cakadyboi"],
})

/**
 * Called when the bot connects to a Twitch server
 */
client.on('connected', (address, port) => {
    console.log(`Connected to ${address}:${port}`)
})

/**
 * Called when the bot recieves a message from a channel
 */
client.on("chat", async (channel, userState, message, self) => {
    // Prevent messages from self from being parsed
    if (self) return;

    if (!message.startsWith("h!")) return;
    // Remove the "h!" and split the message into an array of words
    // Also makes it so that you don't need to put a space after the prefix
    const args = message.slice("h!".length).split(" ")
    if (args.length < 2) {
        client.say(channel, "Please include a minecraft username")
        return; // Invalid command — Update this later to get leaderboards
    }

    const data = await getHypixelInfo(args[1]);

    if (data == undefined) return client.say(channel, "That player does not exist.");

    const response = parseData(data, args[0], channel, args[1])
})

/**
 * Parses data from the Hypixel API
 * @param data The data from the Hypixel API
 * @param game The game that the user is requesting
 * @returns {Object} The data that will be sent to the channel
 */
function parseData(data : any, game : string, channel : string, username : string): object {
    let response: any | null = null;

    switch (game) {
        case "bw" || "bedwars":
            data = data["stats"]["Bedwars"]
            const fkdr = (data["final_kills_bedwars"] / data["final_deaths_bedwars"]).toPrecision(4);

            // console.log(response)
            return client.say(
                channel, 
                `Stats for ${username}: 
                Wins: ${data["wins_bedwars"]}, 
                Losses: ${data["losses_bedwars"]}, 
                Winstreak: ${data["winstreak"]}, 
                FKDR: ${fkdr}`
            );
        
        case "mm" || "murdermystery":
            data = data["stats"]["MurderMystery"];
            const kd = (data["kills"] / data["deaths"]).toPrecision(4);

            return client.say(channel, `Stats for ${username}: 
            Wins: ${data["wins"]}, 
            KD: ${kd}`);
        
        case "sw" || "skywars":
            data = data["stats"]["SkyWars"];

            return client.say(
                channel,
                `Stats for ${username}: 
                Wins: ${data["wins"]}, 
                Losses: ${data["losses"]}, 
                Deaths: ${data["deaths"]}, 
                Kills: ${data["kills"]}`
            );

        default:
            return client.say(channel, "Possible commands include: h!bw, h!sw, h!mm")
    }
}

/**
 * Retrieves the UUID for a player by their in-game name
 * @param name The username of the player
 * @returns The UUID for the given player
 */
async function getUUID(name : string) {
    let uuid;

    try {
        const resp = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${name}`)

        uuid = resp.data["id"]
    } catch (error) {
        return null;
    }

    return uuid;
}

/**
 * Retrieves player data from the Hypixel API
 * @param name The username of the player
 * @returns {Object} The data from the Hypixel API
 */
async function getHypixelInfo(name : string): Promise<any> {

    const uuid = await getUUID(name)
    if (uuid == undefined || uuid == null) {
        return undefined;
    }

    try {
        const resp = await axios.get("https://api.hypixel.net/player", {
            headers: {
                "API-Key": process.env["HYPIXEL_KEY"] as string,
            },
            params: {
                "uuid": uuid,
            }
        })

        return resp.data["player"]
    } catch (error) {
        return null;
    }
}

/**
 * Main function used for connecting to Twitch
 */
async function main() {
    await client.connect()
}

main()