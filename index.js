const TelegramBot = require("node-telegram-bot-api")

const TOKEN = process.env.TOKEN
const GROUP_ID = process.env.GROUP_ID
const SAVE_CHANNEL_ID = process.env.SAVE_CHANNEL_ID

const bot = new TelegramBot(TOKEN, { polling: true })

const inviteLinks = new Map()
const inviteCount = new Map()
let dataMessageId = null

const TARGET = 1000

async function saveData() {
  try {
    const data = JSON.stringify({
      inviteLinks: Object.fromEntries(inviteLinks),
      inviteCount: Object.fromEntries(inviteCount)
    })
    if (dataMessageId) {
      await bot.editMessageText("TFDATA:" + data, {
        chat_id: SAVE_CHANNEL_ID,
        message_id: dataMessageId
      })
    } else {
      const msg = await bot.sendMessage(SAVE_CHANNEL_ID, "TFDATA:" + data)
      dataMessageId = msg.message_id
    }
  } catch (e) {
    console.error("Save error:", e.message)
  }
}

function getRank(userId) {
  const sorted = [...inviteCount.entries()].sort((a, b) => b[1].count - a[1].count)
  const rank = sorted.findIndex(([id]) => id === userId) + 1
  return rank || null
}

async function getOrCreateLink(userId, username) {
  if (inviteLinks.has(userId)) {
    return inviteLinks.get(userId).link
  }

  try {
    const invite = await bot.createChatInviteLink(GROUP_ID, {
      name: "Invite de " + username,
      creates_join_request: false,
      member_limit: 999
    })

    inviteLinks.set(userId, {
      link: invite.invite_link,
      username,
      inviteCode: invite.invite_link.split("/").pop()
    })

    inviteCount.set(userId, { count: 0, username })
    await saveData()

    return invite.invite_link
  } catch (e) {
    console.error("Link error:", e.message)
    return null
  }
}

bot.onText(/\/start/, async (msg) => {
  const userId = msg.from.id
  const username = msg.from.username || msg.from.first_name
  const link = await getOrCreateLink(userId, username)

  const text =
    "TF8 - Invitation Contest\n\n" +
    "🎉 WELCOME TO THE TF8 INVITATION CONTEST !\n\n" +
    "You're in ! Now it's time to bring your network to The Floor 8 🚀\n\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
    "🔗 YOUR PERSONAL INVITE LINK :\n" +
    (link || "Type /mylink to get your link") + "\n\n" +
    "Share this link, every person who joins through it counts as your invite.\n\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
    "🎯 HOW IT WORKS :\n" +
    "1. Share your link\n" +
    "2. Each friend who joins = +1 invitation\n" +
    "3. The more you invite, the higher you climb 🏆\n\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
    "🏆 PRIZES :\n" +
    "🥇 1st place : $50,000 Instant or 2-Step Account - Your choice\n" +
    "🥈 2nd place : $10,000 Instant or 2-Step Account\n" +
    "🥉 3rd place : $5,000 Instant or 2-Step Account\n\n" +
    "Contest ends when the group reaches " + TARGET + " members 👀\n\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
    "📊 COMMANDS :\n" +
    "/mylink - Your unique invitation link\n" +
    "/mystats - Your invitations and current rank\n" +
    "/leaderboard - Top 10 leaderboard\n\n" +
    "Start sharing now ! 🚀"

  bot.sendMessage(msg.chat.id, text)
})

bot.onText(/\/mylink/, async (msg) => {
  const userId = msg.from.id
  const username = msg.from.username || msg.from.first_name
  const link = await getOrCreateLink(userId, username)
  const count = inviteCount.get(userId)?.count || 0
  const rank = getRank(userId)

  const text =
    "TF8 - Invitation Contest\n\n" +
    "🔗 YOUR PERSONAL INVITE LINK :\n" +
    (link || "Error generating link") + "\n\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
    "📊 Your invitations : " + count + "\n" +
    "🏅 Current rank : #" + (rank || "?") + "\n\n" +
    "Share your link and climb the leaderboard ! 🚀"

  bot.sendMessage(msg.chat.id, text)
})

bot.onText(/\/mystats/, (msg) => {
  const userId = msg.from.id
  const data = inviteCount.get(userId)
  const count = data ? data.count : 0
  const rank = getRank(userId)

  let text =
    "TF8 - Invitation Contest\n\n" +
    "📊 YOUR STATS :\n\n" +
    "👥 Invitations : " + count + "\n" +
    "🏅 Current rank : #" + (rank || "?") + "\n"

  if (rank === 1) text += "\n🎁 Current prize : $50,000 Instant or 2-Step Account - Your choice"
  else if (rank === 2) text += "\n🎁 Current prize : $10,000 Instant or 2-Step Account"
  else if (rank === 3) text += "\n🎁 Current prize : $5,000 Instant or 2-Step Account"
  else text += "\n🎯 Keep going - top 3 wins a funded account !"

  text += "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━\n/mylink to share your link 🔗"

  bot.sendMessage(msg.chat.id, text)
})

bot.onText(/\/leaderboard/, (msg) => {
  const top = [...inviteCount.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)

  if (top.length === 0) {
    return bot.sendMessage(msg.chat.id, "No invitations yet. Be the first ! 🚀")
  }

  const medals = ["🥇", "🥈", "🥉"]

  let text =
    "TF8 - Invitation Contest\n\n" +
    "🏆 TOP 10 LEADERBOARD\n\n" +
    "🎯 Contest ends at " + TARGET + " members\n\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"

  top.forEach(([id, data], i) => {
    const rank = medals[i] || (i + 1) + "."
    text += rank + " @" + data.username + " : " + data.count + " invitation" + (data.count > 1 ? "s" : "") + "\n"
  })

  text += "\n━━━━━━━━━━━━━━━━━━━━━━━━━\n/mylink to get your unique link 🔗"

  bot.sendMessage(msg.chat.id, text)
})

bot.on("new_chat_members", async (msg) => {
  const newMembers = msg.new_chat_members
  const inviteLink = msg.invite_link

  if (!inviteLink) return

  const inviteCode = inviteLink.invite_link?.split("/").pop()

  for (const [userId, data] of inviteLinks.entries()) {
    if (data.inviteCode === inviteCode) {
      const current = inviteCount.get(userId) || { count: 0, username: data.username }
      const newCount = current.count + newMembers.length
      inviteCount.set(userId, { count: newCount, username: data.username })

      await saveData()

      const rank = getRank(userId)

      bot.sendMessage(GROUP_ID,
        "📨 " + newMembers.map(m => m.first_name).join(", ") + " joined via @" + data.username + "'s link !\n" +
        "📊 @" + data.username + " : " + newCount + " invitation" + (newCount > 1 ? "s" : "") + " | Rank : #" + (rank || "?")
      )
      break
    }
  }
})

console.log("TF8 Invitation Bot started !")
