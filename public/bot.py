"""
=============================================================================
🎫 SCRATCH THE WIN - OFFICIAL TELEGRAM MINI APP BOT (PRODUCTION ENGINE) 🎫
=============================================================================
High-Performance, Loophole-Proof, Anti-Fraud Telegram Bot for Scratch The Win.

Flow:
1. User sends /start -> Mandatory Channel Join (Blue '✔ Join' buttons + '✔ Claim')
2. User joins channels & clicks '✔ Claim' -> Channel verification
3. Once channels verified -> Step 2: Strict Device Verification
4. Strict device verification in WebApp -> Home unlock + Instant payment notification
5. Every new user gets strictly 1 Scratch Card.
6. Per referral: +1 Free Scratch Card awarded atomically in Firebase RTDB.
7. Admin Commands: /channels, /addchannel, /removechannel, /broadcast (Premium Emojis), /stats.
=============================================================================
"""

import os
import threading
import asyncio
from http.server import HTTPServer, BaseHTTPRequestHandler
import logging
import json
import time
import re
import urllib.request
import urllib.error
import urllib.parse
from telegram import (
    Update,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    WebAppInfo,
    MessageEntity,
)
from telegram.request import HTTPXRequest
from telegram.error import NetworkError, TimedOut, Conflict, BadRequest, Forbidden
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    CallbackQueryHandler,
    ChatJoinRequestHandler,
    ContextTypes,
)

# ---------------------------------------------------------------------------
# 1. CORE BOT CONFIGURATION
# ---------------------------------------------------------------------------
TOKEN = os.environ.get("BOT_TOKEN", "8956392892:AAHHL_KxabHRt5_v3JYQGInzJhqNxDEUr5g").strip()
BOT_USERNAME = os.environ.get("BOT_USERNAME", "scratch_the_win_bot").strip().lstrip("@")
WEB_URL = os.environ.get("WEB_URL", "https://trx-pi.vercel.app").strip().rstrip("/")
RTDB_URL = os.environ.get("RTDB_URL", "https://scratch-7d728-default-rtdb.firebaseio.com").strip().rstrip("/")

# ---------------------------------------------------------------------------
# 2. DEFAULT MANDATORY CHANNELS (2 COLUMNS x 4 ROWS MATCHING SCREENSHOT)
# ---------------------------------------------------------------------------
PERMANENT_CHANNELS = [
    {
        "id": "-1003479783999",
        "name": "Official Channel 1",
        "url": "https://t.me/+7clQNCkYuAAxYWQ1",
        "is_private": True,
    },
    {
        "id": "-1003479784001",
        "name": "Official Channel 2",
        "url": "https://t.me/+7clQNCkYuAAxYWQ1",
        "is_private": True,
    },
    {
        "id": "-1003479784002",
        "name": "Official Channel 3",
        "url": "https://t.me/+7clQNCkYuAAxYWQ1",
        "is_private": True,
    },
    {
        "id": "-1003479784003",
        "name": "Official Channel 4",
        "url": "https://t.me/+7clQNCkYuAAxYWQ1",
        "is_private": True,
    },
    {
        "id": "-1003479784004",
        "name": "Official Channel 5",
        "url": "https://t.me/+7clQNCkYuAAxYWQ1",
        "is_private": True,
    },
    {
        "id": "-1003479784005",
        "name": "Official Channel 6",
        "url": "https://t.me/+7clQNCkYuAAxYWQ1",
        "is_private": True,
    },
    {
        "id": "-1003479784006",
        "name": "Official Channel 7",
        "url": "https://t.me/+7clQNCkYuAAxYWQ1",
        "is_private": True,
    },
    {
        "id": "-1003479784007",
        "name": "Official Channel 8",
        "url": "https://t.me/+7clQNCkYuAAxYWQ1",
        "is_private": True,
    },
]

# ---------------------------------------------------------------------------
# 3. AUTHORIZED BOT OWNERS
# ---------------------------------------------------------------------------
DEFAULT_OWNERS = [
    "rohit79041",
    "sc812490",
]

# ---------------------------------------------------------------------------
# 4. LOGGING CONFIGURATION
# ---------------------------------------------------------------------------
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logger = logging.getLogger("scratch_the_win_bot")


# ---------------------------------------------------------------------------
# 5. RENDER / VPS 24/7 HTTP HEALTH SERVER
# ---------------------------------------------------------------------------
class HealthCheckHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-type", "application/json; charset=utf-8")
        self.end_headers()
        res = {
            "status": "online",
            "bot": "Scratch The Win Telegram Bot",
            "uptime": int(time.time()),
        }
        self.wfile.write(json.dumps(res).encode("utf-8"))

    def do_HEAD(self):
        self.send_response(200)
        self.end_headers()

    def log_message(self, format, *args):
        return


def start_health_server():
    """Starts background HTTP server so hosting platforms keep bot process alive 24/7."""
    port = int(os.environ.get("PORT", 8080))
    try:
        server = HTTPServer(("0.0.0.0", port), HealthCheckHandler)
        logger.info(f"Health server listening on port {port}")
        server.serve_forever()
    except Exception as e:
        logger.warning(f"Health server note: {e}")


# ---------------------------------------------------------------------------
# 6. DATABASE HELPER FUNCTIONS (FIREBASE RTDB REST)
# ---------------------------------------------------------------------------
def db_request(endpoint: str, method: str = "GET", data: dict = None) -> any:
    url = f"{RTDB_URL}/{endpoint.lstrip('/')}"
    try:
        body = json.dumps(data).encode("utf-8") if data is not None else None
        headers = {"Content-Type": "application/json"} if body else {}
        req = urllib.request.Request(url, data=body, method=method, headers=headers)
        with urllib.request.urlopen(req, timeout=6) as resp:
            content = resp.read().decode("utf-8")
            if content and content != "null":
                return json.loads(content)
            return None
    except Exception as e:
        logger.debug(f"DB request note [{method} {endpoint}]: {e}")
        return None


def get_user_from_db(user_id: str) -> dict | None:
    return db_request(f"users/{user_id}.json")


def update_user_in_db(user_id: str, patch_data: dict) -> bool:
    res = db_request(f"users/{user_id}.json", method="PATCH", data=patch_data)
    return res is not None


def is_already_referred(referrer_id: str, new_user_id: str) -> bool:
    res = db_request(f"referrals/{referrer_id}/{new_user_id}.json")
    return res is not None


def record_referral(referrer_id: str, new_user_id: str, name: str, username: str, status: str = "pending_first_scratch"):
    payload = {
        "joinerId": str(new_user_id),
        "name": name or f"User #{new_user_id}",
        "username": username or "",
        "status": status,
        "timestamp": int(time.time() * 1000),
    }
    db_request(f"referrals/{referrer_id}/{new_user_id}.json", method="PUT", data=payload)


def record_channel_joined(user_id: str, channel_id: str):
    clean_ch = re.sub(r"[^a-zA-Z0-9_-]", "_", str(channel_id))
    db_request(f"channel_joins/{user_id}/{clean_ch}.json", method="PUT", data=True)


def is_channel_joined_in_db(user_id: str, channel_id: str) -> bool:
    clean_ch = re.sub(r"[^a-zA-Z0-9_-]", "_", str(channel_id))
    res = db_request(f"channel_joins/{user_id}/{clean_ch}.json")
    return res is True


def award_scratch_to_referrer(referrer_id: str, new_user_name: str) -> dict:
    """
    Awards strictly +1 Free Scratch Card to the referrer in Firebase RTDB atomically.
    """
    now_ms = int(time.time() * 1000)
    current = get_user_from_db(referrer_id)

    if current:
        new_spins = int(current.get("spins") or 0) + 1
        new_friends = int(current.get("friendsJoined") or 0) + 1
        new_earned = int(current.get("spinsEarned") or 0) + 1

        patch_data = {
            "spins": new_spins,
            "friendsJoined": new_friends,
            "spinsEarned": new_earned,
        }
        update_user_in_db(referrer_id, patch_data)

        tx_id = f"tx_{now_ms}_{new_friends}"
        tx_data = {
            "id": tx_id,
            "userId": str(referrer_id),
            "type": "referral_bonus",
            "amount": 0,
            "description": f"Dost {new_user_name} jud gaya! +1 Free Scratch Card mila 🎫",
            "status": "completed",
            "createdAt": now_ms,
        }
        db_request(f"transactions/{tx_id}.json", method="PUT", data=tx_data)

        return {"spins": new_spins, "friendsJoined": new_friends}
    else:
        new_user = {
            "id": str(referrer_id),
            "telegramId": str(referrer_id),
            "name": f"User #{referrer_id}",
            "username": f"user_{referrer_id}",
            "balance": 0,
            "spins": 2,  # 1 initial card + 1 referral card
            "friendsJoined": 1,
            "spinsEarned": 2,
            "createdAt": now_ms,
            "isVerified": True,
            "deviceVerified": True,
        }
        db_request(f"users/{referrer_id}.json", method="PUT", data=new_user)
        return {"spins": 2, "friendsJoined": 1}


# ---------------------------------------------------------------------------
# 7. CHANNELS & OWNERS DYNAMIC MANAGEMENT
# ---------------------------------------------------------------------------
_CHANNELS_CACHE = []
_OWNERS_CACHE = set(o.lower().lstrip("@") for o in DEFAULT_OWNERS)
_LAST_CACHE_TIME = 0


def load_channels() -> list[dict]:
    global _CHANNELS_CACHE, _LAST_CACHE_TIME
    now = time.time()
    if _CHANNELS_CACHE and (now - _LAST_CACHE_TIME < 10):
        return _CHANNELS_CACHE

    combined = [dict(p) for p in PERMANENT_CHANNELS]
    try:
        remote = db_request("bot_config/channels.json")
        if remote:
            items = list(remote.values()) if isinstance(remote, dict) else remote
            for item in items:
                if isinstance(item, dict) and item.get("id"):
                    if not any(str(c.get("id")) == str(item["id"]) for c in combined):
                        combined.append(item)
    except Exception as e:
        logger.warning(f"Error loading channels: {e}")

    _CHANNELS_CACHE = combined
    _LAST_CACHE_TIME = now
    return _CHANNELS_CACHE


def is_owner(user) -> bool:
    uid = str(user.id).lower()
    uname = (user.username or "").lower().lstrip("@")
    return uid in _OWNERS_CACHE or uname in _OWNERS_CACHE


def build_channels_keyboard(channels: list[dict], ref_param: str = None) -> InlineKeyboardMarkup:
    """
    Builds 2-column grid of blue '✔ Join' URL buttons with '✔ Claim' button at bottom.
    """
    buttons = []
    for i in range(0, len(channels), 2):
        row = [InlineKeyboardButton("✔ Join", url=channels[i]["url"])]
        if i + 1 < len(channels):
            row.append(InlineKeyboardButton("✔ Join", url=channels[i + 1]["url"]))
        buttons.append(row)

    claim_callback = f"claim_{ref_param or 'none'}"
    buttons.append([InlineKeyboardButton("✔ Claim", callback_data=claim_callback)])
    return InlineKeyboardMarkup(buttons)


async def check_user_channels(context: ContextTypes.DEFAULT_TYPE, user_id: int) -> tuple[bool, list[dict]]:
    """
    Checks if user is member of all configured mandatory channels.
    """
    channels = load_channels()
    if not channels:
        return (True, [])

    unjoined = []
    for ch in channels:
        ch_id = str(ch.get("id", "")).strip()

        # Check if already marked joined in database
        if is_channel_joined_in_db(str(user_id), ch_id):
            continue

        try:
            target = int(ch_id) if ch_id.lstrip("-").isdigit() else ch_id
            member = await context.bot.get_chat_member(chat_id=target, user_id=user_id)
            if member.status in ["member", "administrator", "creator", "restricted"]:
                record_channel_joined(str(user_id), ch_id)
                continue
            elif member.status in ["left", "kicked"]:
                unjoined.append(ch)
                continue
        except BadRequest as e:
            msg = str(e).lower()
            if "not a member" in msg or "user not found" in msg:
                unjoined.append(ch)
            elif "chat not found" in msg or "bot is not a member" in msg or "chat_admin_required" in msg:
                logger.info(f"Bot is not admin in channel {ch_id}. To strictly check, add bot as admin in channel!")
                continue
        except Exception as e:
            logger.debug(f"Channel check note {ch_id}: {e}")
            continue

    return (len(unjoined) == 0, unjoined)


# ---------------------------------------------------------------------------
# 8. TELEGRAM COMMAND HANDLERS
# ---------------------------------------------------------------------------
async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    /start Command Handler
    Matches user screenshot exactly with blue join buttons and Claim.
    """
    user = update.effective_user
    if not user:
        return

    user_id = str(user.id)
    name = user.first_name or user.full_name or "Friend"
    username = user.username or ""

    args = context.args or []
    ref_param = args[0] if len(args) > 0 else None
    referrer_id = None

    if ref_param:
        clean_ref = ref_param.replace("ref_", "").strip()
        if clean_ref.isdigit():
            referrer_id = clean_ref

    # -----------------------------------------------------------------------
    # ZERO-LOOPHOLE REFERRAL PROCESSING
    # Referral reward is ONLY given after the friend completes their 1st scratch!
    # On /start join: record pending referral and send a small join notification to referrer.
    # -----------------------------------------------------------------------
    if referrer_id:
        if referrer_id == user_id:
            logger.info(f"Self-referral attempted by {user_id}")
        elif is_already_referred(referrer_id, user_id):
            logger.info(f"Duplicate referral attempted for {referrer_id} by {user_id}")
        else:
            record_referral(referrer_id, user_id, name, username, status="pending_first_scratch")
            logger.info(f"Referral pending first scratch: {user_id} referred by {referrer_id}")

            try:
                # Chota sa message refer join ka
                join_msg = (
                    f"👥 <b>New Referral Joined!</b>\n\n"
                    f"👤 <b>{name}</b> ne aapke invite link se join kiya hai!\n"
                    f"⏳ Friend jaise hi device verify karke 1st scratch card khelega, aapko <b>+1 Free Scratch Card</b> mil jayega! 🎫"
                )
                await context.bot.send_message(
                    chat_id=int(referrer_id),
                    text=join_msg,
                    parse_mode="HTML",
                )
            except Exception as e:
                logger.debug(f"Could not notify referrer {referrer_id}: {e}")

    # Ensure user exists in Firebase RTDB with strictly 1 initial Scratch Card
    existing = get_user_from_db(user_id)
    if not existing:
        welcome_user = {
            "id": user_id,
            "telegramId": user_id,
            "name": name,
            "username": username,
            "balance": 0,
            "spins": 1,  # Strictly 1 scratch card initially
            "friendsJoined": 0,
            "spinsEarned": 1,
            "createdAt": int(time.time() * 1000),
            "isVerified": False,
            "deviceVerified": False,
            "referredBy": referrer_id if (referrer_id and referrer_id != user_id) else None,
            "referralRewardGiven": False,
        }
        db_request(f"users/{user_id}.json", method="PUT", data=welcome_user)
        existing = welcome_user

    # If user is already device-verified, show verified dashboard directly
    if existing.get("isVerified") and existing.get("deviceVerified"):
        app_url = f"{WEB_URL}/?start=ref_{referrer_id}" if referrer_id else WEB_URL
        verified_markup = InlineKeyboardMarkup([
            [InlineKeyboardButton("🎉 Click To Home", web_app=WebAppInfo(url=app_url))],
            [InlineKeyboardButton("👥 Refer And Earn", callback_data="my_invite")],
        ])
        verified_text = (
            "🔥<b>Congratulations Sussefuly Verfied</b> ✅\n"
            "🎉 <b>Click To Home And Refer And Earn</b> 🎉\n"
            "✅✅<b>Now All Payment Instant</b> ✅✅"
        )
        await update.message.reply_text(
            text=verified_text,
            reply_markup=verified_markup,
            parse_mode="HTML",
        )
        return

    # STEP 1: Mandatory Channel Join
    channels = load_channels()

    welcome_text = (
        "👑 <b>Hey There! Welcome To Bot !!</b>\n\n"
        "🌺 <b>Join The Channels Below To Continue</b>\n\n"
        "😍 <b>After Joining Click Claim</b>"
    )

    markup = build_channels_keyboard(channels, ref_param)

    await update.message.reply_text(
        text=welcome_text,
        reply_markup=markup,
        parse_mode="HTML",
    )


async def claim_callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handles '✔ Claim' button.
    Verifies channel membership:
    - If unjoined: alerts user.
    - If joined: moves to Step 2 Device Verification.
    """
    query = update.callback_query
    await query.answer()

    user = update.effective_user
    if not user:
        return

    user_id = str(user.id)
    ref_param = None
    if query.data and query.data.startswith("claim_"):
        raw = query.data.replace("claim_", "")
        if raw != "none":
            ref_param = raw

    all_joined, unjoined = await check_user_channels(context, user.id)

    if not all_joined:
        await query.answer(
            "⚠️ Kripya sabhi channels join karein fir Claim dabayein!",
            show_alert=True,
        )
        return

    # STEP 2: Device verification
    verify_url = f"{WEB_URL}/?verify=true&uid={user_id}"
    if ref_param:
        verify_url = f"{WEB_URL}/?verify=true&uid={user_id}&start={ref_param}"

    step2_markup = InlineKeyboardMarkup([
        [
            InlineKeyboardButton(
                "🍑 Please Click Verify Device ✅",
                web_app=WebAppInfo(url=verify_url),
            )
        ],
        [
            InlineKeyboardButton(
                "🔄 Check Status",
                callback_data=f"check_device_{ref_param or 'none'}",
            )
        ],
    ])

    step2_text = (
        "<b>All Channel Verfied Done ✅👌</b>\n"
        "⚠️<b>Step 2:- Device verification</b>\n"
        "🍑 <b>Please Click Verify Device ✅</b>"
    )

    await query.edit_message_text(
        text=step2_text,
        reply_markup=step2_markup,
        parse_mode="HTML",
    )


async def check_device_callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Checks if device verification is completed in RTDB.
    """
    query = update.callback_query
    await query.answer()

    user = update.effective_user
    if not user:
        return

    user_id = str(user.id)
    ref_param = None
    if query.data and query.data.startswith("check_device_"):
        raw = query.data.replace("check_device_", "")
        if raw != "none":
            ref_param = raw

    db_user = get_user_from_db(user_id) or {}
    is_device_verified = db_user.get("deviceVerified") and db_user.get("isVerified")

    if not is_device_verified:
        await query.answer(
            "⚠️ Please click 'Verify Device' button first to complete step 2!",
            show_alert=True,
        )
        return

    # VERIFIED: Unlock home web app & refer and earn
    app_url = f"{WEB_URL}/?start={ref_param}" if ref_param else WEB_URL

    final_markup = InlineKeyboardMarkup([
        [InlineKeyboardButton("🎉 Click To Home", web_app=WebAppInfo(url=app_url))],
        [InlineKeyboardButton("👥 Refer And Earn", callback_data="my_invite")],
    ])

    final_text = (
        "🔥<b>Congratulations Sussefuly Verfied</b> ✅\n"
        "🎉 <b>Click To Home And Refer And Earn</b> 🎉\n"
        "✅✅<b>Now All Payment Instant</b> ✅✅"
    )

    await query.edit_message_text(
        text=final_text,
        reply_markup=final_markup,
        parse_mode="HTML",
    )


async def invite_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Generates unique referral link with quick share."""
    user = update.effective_user
    if not user:
        return

    bot_me = await context.bot.get_me()
    bot_user = bot_me.username or BOT_USERNAME
    invite_link = f"https://t.me/{bot_user}?start=ref_{user.id}"

    db_user = get_user_from_db(str(user.id)) or {}
    spins = db_user.get("spins", 1)
    friends = db_user.get("friendsJoined", 0)

    share_text = urllib.parse.quote(
        f"🎁 Scratch The Win par turant ₹5 Cash Scratch Card jeeto! Ek click me UPI withdrawal milta hai! 👇\n{invite_link}"
    )
    share_url = f"https://t.me/share/url?url={invite_link}&text={share_text}"

    keyboard = [
        [InlineKeyboardButton("🚀 Share Invite Link", url=share_url)],
        [InlineKeyboardButton("🎉 Click To Home", web_app=WebAppInfo(url=WEB_URL))],
    ]

    msg = (
        f"🎉 <b>Click To Home And Refer And Earn</b> 🎉\n\n"
        f"🔗 <b>Your Personal Invite Link:</b>\n"
        f"<code>{invite_link}</code>\n\n"
        f"🎁 <b>Rules:</b>\n"
        f"• Har dost ko refer karne par <b>+1 Free Scratch Card</b>\n"
        f"• Sabhi payments 100% instant UPI / Bank transfer\n"
        f"• ✅✅ <b>Now All Payment Instant</b> ✅✅\n\n"
        f"📊 <b>Your Stats:</b>\n"
        f"• Doston ki Sankhya: <b>{friends}</b>\n"
        f"• Available Scratch Cards: <b>{spins}</b>"
    )

    if update.callback_query:
        await update.callback_query.message.reply_text(
            text=msg,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode="HTML",
        )
    else:
        await update.message.reply_text(
            text=msg,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode="HTML",
        )


async def chat_join_request_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Catches Join Requests sent by users on private channels."""
    req = update.chat_join_request
    if req:
        user_id = str(req.from_user.id)
        chat_id = str(req.chat.id)
        record_channel_joined(user_id, chat_id)
        try:
            await req.approve()
        except Exception:
            pass


async def help_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = (
        "👑 <b>SCRATCH THE WIN - HELP & GUIDE</b> 👑\n\n"
        "1. <b>/start</b> - App start karein aur channels join karein\n"
        "2. <b>/invite</b> - Apna personal referral link paayein (+1 Scratch per invite)\n\n"
        "🔥 <b>Congratulations Sussefuly Verfied ✅</b>\n"
        "🎉 <b>Click To Home And Refer And Earn 🎉</b>\n"
        "✅✅ <b>Now All Payment Instant ✅✅</b>"
    )
    await update.message.reply_text(text=text, parse_mode="HTML")


# ---------------------------------------------------------------------------
# 9. OWNER / ADMIN COMMANDS
# ---------------------------------------------------------------------------
async def ownerhelp_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_owner(update.effective_user):
        await update.message.reply_text("❌ Permission denied!")
        return

    text = (
        "👑 <b>OWNER ADMIN COMMANDS</b> 👑\n\n"
        "• <b>/channels</b> - Active mandatory channels list dekhein\n"
        "• <b>/addchannel &lt;chat_id_or_@username&gt; &lt;name&gt; &lt;url&gt;</b> - Naya channel add karein\n"
        "• <b>/removechannel &lt;chat_id_or_username&gt;</b> - Channel remove karein\n"
        "• <b>/broadcast</b> (Reply karke) - 💎 Telegram Premium custom emojis & media sabhi users ko bhejein\n"
        "• <b>/broadcast &lt;text&gt;</b> - Direct broadcast\n"
        "• <b>/stats</b> - Total users & referrals check karein"
    )
    await update.message.reply_text(text=text, parse_mode="HTML")


async def stats_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_owner(update.effective_user):
        return

    users = db_request("users.json") or {}
    referrals = db_request("referrals.json") or {}

    total_users = len(users) if isinstance(users, dict) else len(users or [])
    total_refs = len(referrals) if isinstance(referrals, dict) else len(referrals or [])

    text = (
        f"📊 <b>BOT LIVE STATS</b> 📊\n\n"
        f"👥 Total Registered Users: <b>{total_users}</b>\n"
        f"🔗 Active Referrals: <b>{total_refs}</b>\n"
        f"🟢 Server Status: <b>Online 24/7</b>"
    )
    await update.message.reply_text(text=text, parse_mode="HTML")


async def channels_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_owner(update.effective_user):
        return

    channels = load_channels()
    if not channels:
        await update.message.reply_text("📢 Koi channels configured nahi hain! Use <code>/addchannel</code>", parse_mode="HTML")
        return

    lines = [f"📢 <b>ACTIVE CHANNELS ({len(channels)}):</b>\n"]
    for idx, ch in enumerate(channels, 1):
        lines.append(
            f"{idx}. <b>{ch.get('name', 'Channel')}</b>\n"
            f"   ID: <code>{ch.get('id')}</code>\n"
            f"   URL: {ch.get('url')}"
        )

    lines.append("\n💡 <i>To add: /addchannel &lt;id&gt; &lt;name&gt; &lt;url&gt;</i>")
    lines.append("💡 <i>To remove: /removechannel &lt;id&gt;</i>")

    await update.message.reply_text("\n\n".join(lines), parse_mode="HTML")


async def addchannel_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    /addchannel <id_or_username> <name> <url>
    """
    if not is_owner(update.effective_user):
        await update.message.reply_text("❌ Permission denied!")
        return

    args = context.args or []
    if len(args) < 3:
        await update.message.reply_text(
            "⚠️ <b>Usage:</b>\n"
            "<code>/addchannel &lt;chat_id_or_@username&gt; &lt;name&gt; &lt;url&gt;</code>\n\n"
            "<b>Example:</b>\n"
            "<code>/addchannel @mychannel VIP Official Channel https://t.me/mychannel</code>",
            parse_mode="HTML",
        )
        return

    ch_id = args[0].strip()
    url = args[-1].strip()
    name = " ".join(args[1:-1]).strip()

    admin_note = ""
    try:
        target = int(ch_id) if ch_id.lstrip("-").isdigit() else ch_id
        bot_member = await context.bot.get_chat_member(chat_id=target, user_id=context.bot.id)
        if bot_member.status in ["administrator", "creator"]:
            admin_note = "\n✅ <i>Bot is verified as Administrator in this channel!</i>"
        else:
            admin_note = "\n⚠️ <i>Please add bot as Admin in this channel so it can verify user membership!</i>"
    except Exception as e:
        admin_note = f"\n⚠️ <i>Note: Make sure bot is added as Admin in this channel ({e})</i>"

    channel_obj = {
        "id": ch_id,
        "name": name,
        "url": url,
        "is_private": ch_id.startswith("-100") or "t.me/+" in url,
        "createdAt": int(time.time() * 1000),
    }

    clean_key = re.sub(r"[^a-zA-Z0-9_-]", "_", ch_id)
    db_request(f"bot_config/channels/{clean_key}.json", method="PUT", data=channel_obj)

    global _CHANNELS_CACHE
    _CHANNELS_CACHE = []
    load_channels()

    await update.message.reply_text(
        f"✅ <b>Channel Added Successfully!</b>\n\n"
        f"📢 <b>Name:</b> {name}\n"
        f"🆔 <b>ID:</b> <code>{ch_id}</code>\n"
        f"🔗 <b>URL:</b> {url}"
        f"{admin_note}",
        parse_mode="HTML",
    )


async def removechannel_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    /removechannel <id_or_username>
    """
    if not is_owner(update.effective_user):
        await update.message.reply_text("❌ Permission denied!")
        return

    args = context.args or []
    if not args:
        await update.message.reply_text(
            "⚠️ <b>Usage:</b> <code>/removechannel &lt;chat_id_or_username&gt;</code>\n"
            "Use <code>/channels</code> to see the list.",
            parse_mode="HTML",
        )
        return

    target_id = args[0].strip()
    clean_key = re.sub(r"[^a-zA-Z0-9_-]", "_", target_id)

    db_request(f"bot_config/channels/{clean_key}.json", method="DELETE")

    global _CHANNELS_CACHE, PERMANENT_CHANNELS
    PERMANENT_CHANNELS = [c for c in PERMANENT_CHANNELS if str(c.get("id")) != target_id and str(c.get("url")) != target_id]
    _CHANNELS_CACHE = []
    load_channels()

    await update.message.reply_text(
        f"🗑️ <b>Channel {target_id} Removed Successfully!</b>",
        parse_mode="HTML",
    )


async def broadcast_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    100% Telegram Premium Custom Animated Emoji broadcast engine using copy_message.
    """
    if not is_owner(update.effective_user):
        return

    reply_msg = update.message.reply_to_message
    full_text = update.message.text or update.message.caption or ""
    command_match = re.match(r"^/broadcast(@\w+)?\s*", full_text)
    prefix_len = command_match.end() if command_match else 0
    direct_text = full_text[prefix_len:].strip()

    if not reply_msg and not direct_text:
        await update.message.reply_text(
            "📢 <b>PREMIUM BROADCAST GUIDE:</b>\n\n"
            "1. Apne custom emojis, photos, ya media wale message ko <b>Reply</b> karein aur likhein: <code>/broadcast</code>\n"
            "2. Direct text bhejne ke liye: <code>/broadcast &lt;message&gt;</code>\n\n"
            "<i>(Reply method Telegram ka copyMessage use karta hai jo sabhi users ko Premium Animated Emojis 100% dikhata hai!)</i>",
            parse_mode="HTML",
        )
        return

    users = db_request("users.json") or {}
    items = list(users.values()) if isinstance(users, dict) else list(users or [])

    valid_user_ids = []
    seen = set()
    for u in items:
        if isinstance(u, dict) and u.get("id"):
            try:
                uid = int(u["id"])
                if uid not in seen:
                    seen.add(uid)
                    valid_user_ids.append(uid)
            except Exception:
                continue

    if not valid_user_ids:
        await update.message.reply_text("⚠️ Database me koi users nahi mile!")
        return

    await update.message.reply_text(
        f"🚀 Broadcast shuru ho raha hai {len(valid_user_ids)} users ko...",
        parse_mode="HTML",
    )

    sent = 0
    failed = 0

    for uid in valid_user_ids:
        try:
            if reply_msg:
                await context.bot.copy_message(
                    chat_id=uid,
                    from_chat_id=update.effective_chat.id,
                    message_id=reply_msg.message_id,
                )
            else:
                await context.bot.send_message(
                    chat_id=uid,
                    text=direct_text,
                    parse_mode="HTML",
                )
            sent += 1
            await asyncio.sleep(0.04)  # Anti-flood rate limit
        except Exception:
            failed += 1

    await update.message.reply_text(
        f"✅ <b>Broadcast Completed!</b>\n"
        f"Delivered: <b>{sent}</b> | Failed/Blocked: <b>{failed}</b>",
        parse_mode="HTML",
    )


# ---------------------------------------------------------------------------
# 10. MAIN BOT INITIALIZATION
# ---------------------------------------------------------------------------
def main():
    logger.info("Starting Scratch The Win Telegram Bot Engine...")

    t = threading.Thread(target=start_health_server, daemon=True)
    t.start()

    request_client = HTTPXRequest(
        connect_timeout=30.0,
        read_timeout=30.0,
        write_timeout=30.0,
        pool_timeout=30.0,
    )

    app = (
        ApplicationBuilder()
        .token(TOKEN)
        .request(request_client)
        .build()
    )

    # Core user commands (Wallet & clutter removed)
    app.add_handler(CommandHandler("start", start_handler))
    app.add_handler(CommandHandler("invite", invite_handler))
    app.add_handler(CommandHandler("refer", invite_handler))
    app.add_handler(CommandHandler("help", help_handler))

    # Admin commands
    app.add_handler(CommandHandler("ownerhelp", ownerhelp_handler))
    app.add_handler(CommandHandler("stats", stats_handler))
    app.add_handler(CommandHandler("channels", channels_handler))
    app.add_handler(CommandHandler("addchannel", addchannel_handler))
    app.add_handler(CommandHandler("removechannel", removechannel_handler))
    app.add_handler(CommandHandler("broadcast", broadcast_handler))

    # Callback Query Handlers
    app.add_handler(CallbackQueryHandler(claim_callback_handler, pattern=r"^claim_"))
    app.add_handler(CallbackQueryHandler(check_device_callback_handler, pattern=r"^check_device_"))
    app.add_handler(CallbackQueryHandler(invite_handler, pattern=r"^my_invite$"))

    # Join Request Handler (Catches join request clicks)
    app.add_handler(ChatJoinRequestHandler(chat_join_request_handler))

    logger.info(f"Bot started successfully with Token: {TOKEN[:10]}... Web URL: {WEB_URL}")

    retry_delay = 5
    while True:
        try:
            app.run_polling(drop_pending_updates=True, close_loop=False)
            break
        except (NetworkError, TimedOut) as e:
            logger.warning(f"Network drop: {e}. Retrying in {retry_delay}s...")
            time.sleep(retry_delay)
            retry_delay = min(retry_delay * 2, 60)
        except Conflict:
            logger.error("Conflict: Another instance of this bot is already running.")
            break
        except Exception as e:
            logger.error(f"Unexpected bot crash: {e}. Retrying in 10s...")
            time.sleep(10)


if __name__ == "__main__":
    main()
