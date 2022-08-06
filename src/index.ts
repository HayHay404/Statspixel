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
    if (args.length < 2) return; // Invalid command

    const data = await getHypixelInfo(args[1]);

    if (data == null) return;

    const response = parseData(data, args[0])

    if (response == null) {
        return client.say(channel, "User not found. Please try again later.")
    } else if (response == undefined) {
        return client.say(channel, "That player does not exist.")
    }

    // You might want to make the message just what the function returns
    // For some gamemodes, it probably won't be the same types of data (e.g. survival)
    return client.say(channel, `Stats for ${args[1]}: Wins: ${response["wins"]}, Losses: ${response["losses"]}, Winstreak: ${response["winstreak"]}, FKDR: ${response["fkdr"]}`)
})

/**
 * Parses data from the Hypixel API
 * @param data The data from the Hypixel API
 * @param game The game that the user is requesting
 * @returns {Object} The data that will be sent to the channel
 */
function parseData(data : any, game : string) {
    let response = null;

    switch (game) {
        case "bw" || "bedwars":
            data = data["stats"]["Bedwars"]
            const fkdr = (data["final_kills_bedwars"] / data["final_deaths_bedwars"]).toPrecision(4);

            response = {
                "fkdr": fkdr,
                "losses": data["losses_bedwars"],
                "wins": data["wins_bedwars"],
                "winstreak": data["winstreak"]
            }
            // console.log(response)
            break;

        default:
            response = null;
            break;
    }

    return response;
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
async function getHypixelInfo(name : string) {

    const uuid = await getUUID(name)
    if (uuid == null) {
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