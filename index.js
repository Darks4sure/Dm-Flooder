const fs = require('fs');
const { Client, Intents, MessageEmbed } = require('discord.js');

// Read tokens from the tokens.txt file
const readTokens = () => {
  return fs.readFileSync('tokens.txt', 'utf-8').split('\n').map(token => token.trim()).filter(token => token.length > 0);
};

// Read secured users from secure.txt
const readSecuredUsers = () => {
  if (!fs.existsSync('secure.txt')) {
    return [];
  }
  return fs.readFileSync('secure.txt', 'utf-8').split('\n').map(line => line.trim()).filter(line => line.length > 0);
};

// Add a user to secure.txt if not already secured
const addToSecure = (userId) => {
  const securedUsers = readSecuredUsers();
  if (!securedUsers.includes(userId)) {
    securedUsers.push(userId);
    fs.writeFileSync('secure.txt', securedUsers.join('\n') + '\n');
    console.log(`User ${userId} added to secure list.`);
    return true;  // Return true when successfully added
  }
  return false;  // Return false if already secured
};

// Remove a user from secure.txt if they are secured
const removeFromSecure = (userId) => {
  let securedUsers = readSecuredUsers();
  if (securedUsers.includes(userId)) {
    securedUsers = securedUsers.filter(user => user !== userId);
    fs.writeFileSync('secure.txt', securedUsers.join('\n') + '\n');
    console.log(`User ${userId} removed from secure list.`);
    return true;  // Return true when successfully removed
  }
  return false;  // Return false if not secured
};

// Create an embed message with a dark blue color
const createEmbed = (title, description, color = '#1e2a47') => {
  return new MessageEmbed()
    .setTitle(title)
    .setDescription(description)
    .setColor(color);
};

// Global cooldown flag
let globalCooldown = false;

// Helper function to sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Handle rate limiting
const handleRateLimit = async () => {
  globalCooldown = true;
  await sleep(4000);  // 4 seconds cooldown
  globalCooldown = false;
};

// Create a list of bot clients
const botClients = [];
const botTokens = readTokens();
if (botTokens.length === 0) {
  console.log('No bot tokens found in tokens.txt.');
  process.exit(1);
}

// Define the channel ID where the bot should respond to commands
const allowedChannelId = '1311341605135061038';  // Replace with the actual channel ID

// Set up a main bot with an appropriate set of intents
const mainBot = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.MESSAGE_CONTENT
  ]
});

// Bot clients initialization
botTokens.forEach((token, index) => {
  const botClient = new Client({
    intents: [
      Intents.FLAGS.GUILDS,
      Intents.FLAGS.GUILD_MESSAGES,
      Intents.FLAGS.DIRECT_MESSAGES,
      Intents.FLAGS.MESSAGE_CONTENT
    ]
  });

  botClient.login(token)
    .then(() => {
      console.log(`Bot with token ${token.substring(0, 5)}... logged in.`);
      
      // Set the presence for the bot based on the index
      const statuses = [
        '/drontop | FUCK SKIDS! | Darks Papa', 
        '/drontop | FUCK SKIDS! | Darks Papa', 
        '/drontop | FUCK SKIDS! | Darks Papa'
      ];
      
      // Cycle through the statuses
      botClient.user.setPresence({
        activities: [{ name: statuses[index % statuses.length], type: 'PLAYING' }],
        status: 'dnd'
      });

      console.log(`Presence set for bot with token ${token.substring(0, 5)}...: ${statuses[index % statuses.length]}`);
    })
    .catch(err => {
      console.error(`Failed to login bot with token ${token.substring(0, 5)}...`, err);
    });

  botClients.push(botClient);
});

// Handle ready event for the main bot
mainBot.once('ready', () => {
  console.log(`Main bot logged in as ${mainBot.user.tag}`);
});

// Initialize cooldowns map
const cooldowns = new Map();  // Track cooldowns for users and commands

// Helper function to send DMs in batches
const sendDMsInBatches = async (botClient, userId, message, amount) => {
  const user = await botClient.users.fetch(userId);
  let successfulDMs = 0;
  for (let i = 0; i < amount; i++) {
    try {
      await user.send(message);
      successfulDMs++;
    } catch (err) {
      console.error(`Error sending DM from bot ${botClient.user.tag} to ${userId}:`, err);
    }
  }
  return successfulDMs;
};

// Check if the bot can DM the user
const canDMUser = async (userId) => {
  try {
    const user = await mainBot.users.fetch(userId);
    await user.send('- **You Were Flooded By https://discord.gg/4k6UCanPh8 JOIN TO FLOOD YOUR ENEMIES OR FRIENDS FOR FUN**');
    return true;
  } catch (error) {
    return false;
  }
};

// Extract user ID from mention or ID
const extractUserId = (input) => {
  const regex = /<@!?(\d+)>/;
  const match = input.match(regex);
  if (match) {
    return match[1];
  }
  return input;
};

// Handle message event for the main bot
mainBot.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const args = message.content.split(' ');
  const command = args[0].toLowerCase();

  // Ensure the bot only responds to commands in the allowed channel for the 'flood' command
  if (command === 'flood' && message.channel.id !== allowedChannelId) {
    return message.channel.send({ embeds: [createEmbed('Flood Command Restricted', 'The flood command can only be used in the specified channel.')] });
  }

  // Check if the user is on cooldown for any command
  const now = Date.now();
  const userCooldown = cooldowns.get(message.author.id);

  if (userCooldown && now < userCooldown) {
    const timeLeft = ((userCooldown - now) / 1000).toFixed(1);
    return message.channel.send({ embeds: [createEmbed('Cooldown', `Please wait ${timeLeft} seconds before using another command.`)] });
  }

  // Set a new cooldown for the user
  cooldowns.set(message.author.id, now + 5000); // 5 seconds cooldown

  switch (command) {
    case 'secure':
      if (addToSecure(message.author.id)) {
        message.channel.send({ embeds: [createEmbed('Success', `You have been secured, ${message.author.tag}. No One Can Flood Your Dms!`)] });
      } else {
        message.channel.send({ embeds: [createEmbed('Already Secured', `You are already secured, ${message.author.tag}.`)] });
      }
      break;

    case 'unsecure':
      if (removeFromSecure(message.author.id)) {
        message.channel.send({ embeds: [createEmbed('Successfully Unsecured!', `You have been unsecured, ${message.author.tag}. Anyone Can Flood Your Dms!`)] });
      } else {
        message.channel.send({ embeds: [createEmbed('Already Unsecured!', `You are not secured, ${message.author.tag}.`)] });
      }
      break;

    case 'flood':
      if (args.length < 3) {
        return message.channel.send({ embeds: [createEmbed('Provide Valid Arguments', 'Usage: flood <user.id> <message> <amount>')] });
      }

      const dmUserId = extractUserId(args[1]);
      const dmMessage = args.slice(2, args.length - 1).join(' ');
      let amount = parseInt(args[args.length - 1]);

      if (isNaN(amount) || amount <= 0) {
        return message.channel.send({ embeds: [createEmbed('Invalid Amount', 'Please provide a valid amount (greater than 0).')] });
      }

      if (amount > 30) {
        return message.channel.send({ embeds: [createEmbed('Amount Too High', 'The flood amount cannot exceed 30.')] });
      }

      // Check if the user is secured
      if (readSecuredUsers().includes(dmUserId)) {
        return message.channel.send({ embeds: [createEmbed('Secured Account', 'This user has their account secured and cannot be flooded.')] });
      }

      // Check if the user can receive DMs
      const canDM = await canDMUser(dmUserId);
      if (!canDM) {
        return message.channel.send({ embeds: [createEmbed('DMs Closed', 'This user has closed DMs and cannot be flooded.')] });
      }

      // Send flood start message
      const startEmbed = createEmbed('Flood Started', `
        Target: <@${dmUserId}>
        Reason: ${dmMessage}
        Active Bots: ${botClients.length}
      `);
      const statusMessage = await message.channel.send({ embeds: [startEmbed] });

      const startTime = Date.now();
      let totalDMsSent = 0;

      // Perform DM flood with live updates
      await Promise.all(botClients.map(async (botClient) => {
        const dmsSent = await sendDMsInBatches(botClient, dmUserId, dmMessage, amount);
        totalDMsSent += dmsSent;
        await statusMessage.edit({
          embeds: [
            createEmbed('Flood Status', `
              Target: <@${dmUserId}>
              Active Bots: ${botClients.length}
              DMs Sent: ${totalDMsSent}
            `)
          ]
        });
      }));

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(1);  // Duration in seconds
      const dps = (totalDMsSent / duration).toFixed(2);  // DMs per second

      // Final completion message
      await statusMessage.edit({
        embeds: [
          createEmbed('Flood Completed', `
            Successfully sent ${totalDMsSent} DMs to <@${dmUserId}>.
            Duration: ${duration}s
            DMs per Second: ${dps}
            Active Bots: ${botClients.length}
          `)
        ]
      });

      await handleRateLimit();
      break;

    case 'help':
      message.channel.send({ embeds: [createEmbed('Help', `
        **Commands:**
        - \`secure\` - Secures your account to block Flood
        - \`unsecure\` - Unsecures your account to allow Flood
        - \`flood <user.id> <message> <amount>\` - Sends a DM FLOOD to a user
      `)] });
      break;

    case 'stats':
      const totalBots = botClients.length;
      message.channel.send({ embeds: [createEmbed('Stats', `There are currently ${totalBots} bot(s) running.`)] });
      break;

    default:
      break;
  }
});

// Log in the main bot with your token
mainBot.login('MTMxMTc4MjAyMDY0MDQwNzY0Mw.GS7IUI.3nkn-Yn7yi6rVuWjCnPmM4rup7wtsuxB-_mcU0')
  .then(() => {
    console.log('Main bot logged in successfully!');
  })
  .catch(err => {
    console.error('Failed to log in main bot:', err);
  });
