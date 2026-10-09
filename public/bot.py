"""
=============================================================================
🎫 SCRATCH THE WIN - OFFICIAL TELEGRAM MINI APP BOT (ZERO-DEPENDENCY ENGINE) 🎫
=============================================================================
100% Pure Python Standard Library Telegram Bot Engine.
✅ NO 'pip install' required! Works directly in VS Code, uv Python 3.14, CMD, Render & VPS!
✅ Zero ModuleNotFoundError - uses built-in urllib & json to talk directly to Telegram API.

Flow:
1. User sends /start -> Mandatory Channel Join (2x4 Grid '✔ Join' buttons + '✔ Claim')
2. User joins channels & clicks '✔ Claim' -> Real-time Channel Verification
3. Once channels verified -> Step 2: Strict Device Verification
4. Strict device verification in WebApp -> Home unlock + Instant payment notification
5. Every new user gets strictly 1 Scratch Card.
6. Per referral: +1 Free Scratch Card awarded after friend's 1st scratch in Firebase RTDB.
7. Admin Commands: /ownerhelp, /channels, /addchannel, /removechannel, /emojitest, /broadcast, /stats.
=============================================================================
"""

import os
import sys
import json
import time
import re
import threading
import logging
import urllib.request
import urllib.error
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler

# ---------------------------------------------------------------------------
# 1. CORE BOT CONFIGURATION
# ---------------------------------------------------------------------------
TOKEN = os.environ.get("BOT_TOKEN", "8956392892:AAHHL_KxabHRt5_v3JYQGInzJhqNxDEUr5g").strip()
BOT_USERNAME = os.environ.get("BOT_USERNAME", "scratch_the_win_bot").strip().lstrip("@")
WEB_URL = os.environ.get("WEB_URL", "https://scbot-ochre.vercel.app").strip().rstrip("/")
RTDB_URL = os.environ.get("RTDB_URL", "https://scratch-7d728-default-rtdb.firebaseio.com").strip().rstrip("/")
TG_API_BASE = f"https://api.telegram.org/bot{TOKEN}"

# ---------------------------------------------------------------------------
# 2. DEFAULT MANDATORY CHANNELS (2 COLUMNS x 4 ROWS)
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
            "web_url": WEB_URL,
            "uptime": int(time.time()),
        }
        self.wfile.write(json.dumps(res).encode("utf-8"))

    def do_HEAD(self):
        self.send_response(200)
        self.end_headers()

    def log_message(self, format, *args):
        return


def start_health_server():
    port = int(os.environ.get("PORT", 8080))
    try:
        server = HTTPServer(("0.0.0.0", port), HealthCheckHandler)
        logger.info(f"Health server listening on port {port}")
        server.serve_forever()
    except Exception as e:
        logger.warning(f"Health server note: {e}")


# ---------------------------------------------------------------------------
# 6. TELEGRAM BOT API CLIENT (PURE PYTHON - NO EXTERNAL PACKAGES)
# ---------------------------------------------------------------------------
_BOT_INFO_CACHE = None


def tg_api(method: str, payload: dict = None, timeout: int = 35) -> dict:
    url = f"{TG_API_BASE}/{method}"
    data = json.dumps(payload or {}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw)
    except urllib.error.HTTPError as e:
        try:
            err_body = e.read().decode("utf-8")
            return json.loads(err_body)
        except Exception:
            return {"ok": False, "description": str(e)}
    except Exception as e:
        return {"ok": False, "description": str(e)}


def get_bot_info() -> dict:
    global _BOT_INFO_CACHE
    if _BOT_INFO_CACHE:
        return _BOT_INFO_CACHE
    res = tg_api("getMe", {})
    if res.get("ok") and res.get("result"):
        _BOT_INFO_CACHE = res["result"]
        return _BOT_INFO_CACHE
    return {"id": 0, "username": BOT_USERNAME}


def send_message(chat_id, text: str, reply_markup: dict = None, parse_mode: str = "HTML") -> dict:
    payload = {"chat_id": chat_id, "text": text}
    if parse_mode:
        payload["parse_mode"] = parse_mode
    if reply_markup:
        payload["reply_markup"] = reply_markup
    return tg_api("sendMessage", payload)


def edit_message_text(chat_id, message_id: int, text: str, reply_markup: dict = None, parse_mode: str = "HTML") -> dict:
    payload = {
        "chat_id": chat_id,
        "message_id": message_id,
        "text": text,
    }
    if parse_mode:
        payload["parse_mode"] = parse_mode
    if reply_markup:
        payload["reply_markup"] = reply_markup
    return tg_api("editMessageText", payload)


def answer_callback_query(callback_query_id: str, text: str = None, show_alert: bool = False) -> dict:
    payload = {"callback_query_id": callback_query_id, "show_alert": show_alert}
    if text:
        payload["text"] = text
    return tg_api("answerCallbackQuery", payload)


def copy_message(chat_id, from_chat_id, message_id: int) -> dict:
    return tg_api(
        "copyMessage",
        {
            "chat_id": chat_id,
            "from_chat_id": from_chat_id,
            "message_id": message_id,
        },
    )


# ---------------------------------------------------------------------------
# 7. DATABASE HELPER FUNCTIONS (FIREBASE RTDB REST)
# ---------------------------------------------------------------------------
def db_request(endpoint: str, method: str = "GET", data: any = None) -> any:
    url = f"{RTDB_URL}/{endpoint.lstrip('/')}"
    try:
        body = json.dumps(data).encode("utf-8") if data is not None else None
        headers = {"Content-Type": "application/json"} if body else {}
        req = urllib.request.Request(url, data=body, method=method, headers=headers)
        with urllib.request.urlopen(req, timeout=8) as resp:
            content = resp.read().decode("utf-8")
            if content and content != "null":
                return json.loads(content)
            return None
    except Exception as e:
        logger.debug(f"DB request note [{method} {endpoint}]: {e}")
        return None


def get_user_from_db(user_id: str) -> dict | None:
    return db_request(f"users/{user_id}.json")


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


# ---------------------------------------------------------------------------
# 8. CHANNELS & OWNERS DYNAMIC MANAGEMENT
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


def is_owner(user: dict) -> bool:
    if not user:
        return False
    uid = str(user.get("id", "")).lower()
    uname = str(user.get("username", "")).lower().lstrip("@")
    return uid in _OWNERS_CACHE or uname in _OWNERS_CACHE


def build_channels_keyboard(channels: list[dict], ref_param: str = None) -> dict:
    buttons = []
    for i in range(0, len(channels), 2):
        row = [{"text": "✔ Join", "url": channels[i]["url"]}]
        if i + 1 < len(channels):
            row.append({"text": "✔ Join", "url": channels[i + 1]["url"]})
        buttons.append(row)

    claim_callback = f"claim_{ref_param or 'none'}"
    buttons.append([{"text": "✔ Claim", "callback_data": claim_callback}])
    return {"inline_keyboard": buttons}


def check_user_channels(user_id: int) -> tuple[bool, list[dict]]:
    channels = load_channels()
    if not channels:
        return (True, [])

    unjoined = []
    for ch in channels:
        ch_id = str(ch.get("id", "")).strip()

        if is_channel_joined_in_db(str(user_id), ch_id):
            continue

        target = int(ch_id) if ch_id.lstrip("-").isdigit() else ch_id
        res = tg_api("getChatMember", {"chat_id": target, "user_id": user_id})

        if res.get("ok") and res.get("result"):
            status = res["result"].get("status", "")
            if status in ["member", "administrator", "creator", "restricted"]:
                record_channel_joined(str(user_id), ch_id)
                continue
            elif status in ["left", "kicked"]:
                unjoined.append(ch)
                continue
        else:
            desc = str(res.get("description", "")).lower()
            if "not a member" in desc or "user not found" in desc:
                unjoined.append(ch)
            elif "chat not found" in desc or "bot is not a member" in desc or "chat_admin_required" in desc:
                logger.info(f"Bot is not admin in channel {ch_id}. Skipping strict check for this placeholder channel.")
                continue

    return (len(unjoined) == 0, unjoined)


# ---------------------------------------------------------------------------
# 9. COMMAND & CALLBACK HANDLERS
# ---------------------------------------------------------------------------
def handle_start(chat_id, user: dict, args: list[str]):
    user_id = str(user.get("id"))
    name = user.get("first_name") or user.get("username") or "Friend"
    username = user.get("username") or ""

    ref_param = args[0] if len(args) > 0 else None
    referrer_id = None

    if ref_param:
        clean_ref = ref_param.replace("ref_", "").strip()
        if clean_ref.isdigit():
            referrer_id = clean_ref

    if referrer_id:
        if referrer_id == user_id:
            logger.info(f"Self-referral attempted by {user_id}")
        elif is_already_referred(referrer_id, user_id):
            logger.info(f"Duplicate referral attempted for {referrer_id} by {user_id}")
        else:
            record_referral(referrer_id, user_id, name, username, status="pending_first_scratch")
            logger.info(f"Referral pending first scratch: {user_id} referred by {referrer_id}")
            join_msg = (
                f"👥 <b>New Referral Joined!</b>\n\n"
                f"👤 <b>{name}</b> ne aapke invite link se join kiya hai!\n"
                f"⏳ Friend jaise hi device verify karke 1st scratch card khelega, aapko <b>+1 Free Scratch Card</b> mil jayega! 🎫"
            )
            send_message(int(referrer_id), join_msg)

    existing = get_user_from_db(user_id)
    if not existing:
        welcome_user = {
            "id": user_id,
            "telegramId": user_id,
            "name": name,
            "username": username,
            "balance": 0,
            "spins": 1,
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

    if existing.get("isVerified") and existing.get("deviceVerified"):
        app_url = f"{WEB_URL}/?start=ref_{referrer_id}" if referrer_id else WEB_URL
        verified_markup = {
            "inline_keyboard": [
                [{"text": "🎉 Click To Home", "web_app": {"url": app_url}}],
                [{"text": "👥 Refer And Earn", "callback_data": "my_invite"}],
            ]
        }
        verified_text = (
            "🔥<b>Congratulations Sussefuly Verfied</b> ✅\n"
            "🎉 <b>Click To Home And Refer And Earn</b> 🎉\n"
            "✅✅<b>Now All Payment Instant</b> ✅✅"
        )
        send_message(chat_id, verified_text, reply_markup=verified_markup)
        return

    channels = load_channels()
    welcome_text = (
        "👑 <b>Hey There! Welcome To Bot !!</b>\n\n"
        "🌺 <b>Join The Channels Below To Continue</b>\n\n"
        "😍 <b>After Joining Click Claim</b>"
    )
    markup = build_channels_keyboard(channels, ref_param)
    send_message(chat_id, welcome_text, reply_markup=markup)


def handle_claim_callback(query: dict):
    query_id = query.get("id")
    user = query.get("from") or {}
    msg = query.get("message") or {}
    chat_id = msg.get("chat", {}).get("id")
    message_id = msg.get("message_id")
    data = query.get("data") or ""

    user_id = str(user.get("id"))
    ref_param = None
    if data.startswith("claim_"):
        raw = data.replace("claim_", "")
        if raw != "none":
            ref_param = raw

    all_joined, _ = check_user_channels(int(user_id))
    if not all_joined:
        answer_callback_query(query_id, "⚠️ Kripya sabhi channels join karein fir Claim dabayein!", show_alert=True)
        return

    answer_callback_query(query_id)

    verify_url = f"{WEB_URL}/?verify=true&uid={user_id}"
    if ref_param:
        verify_url = f"{WEB_URL}/?verify=true&uid={user_id}&start={ref_param}"

    step2_markup = {
        "inline_keyboard": [
            [{"text": "🍑 Please Click Verify Device ✅", "web_app": {"url": verify_url}}],
            [{"text": "🔄 Check Status", "callback_data": f"check_device_{ref_param or 'none'}"}],
        ]
    }
    step2_text = (
        "<b>All Channel Verfied Done ✅👌</b>\n"
        "⚠️<b>Step 2:- Device verification</b>\n"
        "🍑 <b>Please Click Verify Device ✅</b>"
    )
    edit_message_text(chat_id, message_id, step2_text, reply_markup=step2_markup)


def handle_check_device_callback(query: dict):
    query_id = query.get("id")
    user = query.get("from") or {}
    msg = query.get("message") or {}
    chat_id = msg.get("chat", {}).get("id")
    message_id = msg.get("message_id")
    data = query.get("data") or ""

    user_id = str(user.get("id"))
    ref_param = None
    if data.startswith("check_device_"):
        raw = data.replace("check_device_", "")
        if raw != "none":
            ref_param = raw

    db_user = get_user_from_db(user_id) or {}
    is_device_verified = db_user.get("deviceVerified") and db_user.get("isVerified")

    if not is_device_verified:
        answer_callback_query(
            query_id,
            "⚠️ Please click 'Verify Device' button first to complete step 2!",
            show_alert=True,
        )
        return

    answer_callback_query(query_id)
    app_url = f"{WEB_URL}/?start={ref_param}" if ref_param else WEB_URL
    final_markup = {
        "inline_keyboard": [
            [{"text": "🎉 Click To Home", "web_app": {"url": app_url}}],
            [{"text": "👥 Refer And Earn", "callback_data": "my_invite"}],
        ]
    }
    final_text = (
        "🔥<b>Congratulations Sussefuly Verfied</b> ✅\n"
        "🎉 <b>Click To Home And Refer And Earn</b> 🎉\n"
        "✅✅<b>Now All Payment Instant</b> ✅✅"
    )
    edit_message_text(chat_id, message_id, final_text, reply_markup=final_markup)


def handle_invite(chat_id, user: dict):
    user_id = str(user.get("id"))
    bot_info = get_bot_info()
    bot_user = bot_info.get("username") or BOT_USERNAME
    invite_link = f"https://t.me/{bot_user}?start=ref_{user_id}"

    db_user = get_user_from_db(user_id) or {}
    spins = db_user.get("spins", 1)
    friends = db_user.get("friendsJoined", 0)

    share_text = urllib.parse.quote(
        f"🎁 Scratch The Win par turant ₹5 Cash Scratch Card jeeto! Ek click me UPI withdrawal milta hai! 👇\n{invite_link}"
    )
    share_url = f"https://t.me/share/url?url={invite_link}&text={share_text}"

    markup = {
        "inline_keyboard": [
            [{"text": "🚀 Share Invite Link", "url": share_url}],
            [{"text": "🎉 Click To Home", "web_app": {"url": WEB_URL}}],
        ]
    }

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
    send_message(chat_id, msg, reply_markup=markup)


def handle_help(chat_id):
    text = (
        "👑 <b>SCRATCH THE WIN - HELP & GUIDE</b> 👑\n\n"
        "1. <b>/start</b> - App start karein aur channels join karein\n"
        "2. <b>/invite</b> - Apna personal referral link paayein (+1 Scratch per invite)\n\n"
        "🔥 <b>Congratulations Sussefuly Verfied ✅</b>\n"
        "🎉 <b>Click To Home And Refer And Earn 🎉</b>\n"
        "✅✅ <b>Now All Payment Instant ✅✅</b>"
    )
    send_message(chat_id, text)


def handle_ownerhelp(chat_id, user: dict):
    if not is_owner(user):
        send_message(chat_id, "❌ Permission denied!")
        return
    text = (
        "👑 <b>OWNER ADMIN COMMANDS</b> 👑\n\n"
        "• <b>/channels</b> - Active mandatory channels list dekhein\n"
        "• <b>/addchannel &lt;chat_id_or_@username&gt; &lt;name&gt; &lt;url&gt;</b> - Naya channel add karein\n"
        "• <b>/removechannel &lt;chat_id_or_username&gt;</b> - Channel remove karein\n"
        "• <b>/emojitest</b> (Reply karke) - 🧪 Telegram Premium animated custom emojis preview test karein\n"
        "• <b>/broadcast</b> (Reply karke) - 💎 Telegram Premium custom emojis & media sabhi users ko bhejein\n"
        "• <b>/broadcast &lt;text&gt;</b> - Direct broadcast\n"
        "• <b>/stats</b> - Total users & referrals check karein"
    )
    send_message(chat_id, text)


def handle_stats(chat_id, user: dict):
    if not is_owner(user):
        return
    users = db_request("users.json") or {}
    referrals = db_request("referrals.json") or {}
    total_users = len(users) if isinstance(users, dict) else len(users or [])
    total_refs = len(referrals) if isinstance(referrals, dict) else len(referrals or [])

    text = (
        f"📊 <b>BOT LIVE STATS</b> 📊\n\n"
        f"👥 Total Registered Users: <b>{total_users}</b>\n"
        f"🔗 Active Referrals: <b>{total_refs}</b>\n"
        f"🌐 Web App URL: <code>{WEB_URL}</code>\n"
        f"🟢 Server Status: <b>Online 24/7</b>"
    )
    send_message(chat_id, text)


def handle_channels(chat_id, user: dict):
    if not is_owner(user):
        return
    channels = load_channels()
    if not channels:
        send_message(chat_id, "📢 Koi channels configured nahi hain! Use <code>/addchannel</code>")
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
    send_message(chat_id, "\n\n".join(lines))


def handle_addchannel(chat_id, user: dict, args: list[str]):
    if not is_owner(user):
        send_message(chat_id, "❌ Permission denied!")
        return
    if len(args) < 3:
        send_message(
            chat_id,
            "⚠️ <b>Usage:</b>\n"
            "<code>/addchannel &lt;chat_id_or_@username&gt; &lt;name&gt; &lt;url&gt;</code>\n\n"
            "<b>Example:</b>\n"
            "<code>/addchannel @mychannel VIP Official Channel https://t.me/mychannel</code>",
        )
        return

    ch_id = args[0].strip()
    url = args[-1].strip()
    name = " ".join(args[1:-1]).strip()

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

    send_message(
        chat_id,
        f"✅ <b>Channel Added Successfully!</b>\n\n"
        f"📢 <b>Name:</b> {name}\n"
        f"🆔 <b>ID:</b> <code>{ch_id}</code>\n"
        f"🔗 <b>URL:</b> {url}",
    )


def handle_removechannel(chat_id, user: dict, args: list[str]):
    if not is_owner(user):
        send_message(chat_id, "❌ Permission denied!")
        return
    if not args:
        send_message(
            chat_id,
            "⚠️ <b>Usage:</b> <code>/removechannel &lt;chat_id_or_username&gt;</code>\n"
            "Use <code>/channels</code> to see the list.",
        )
        return

    target_id = args[0].strip()
    clean_key = re.sub(r"[^a-zA-Z0-9_-]", "_", target_id)
    db_request(f"bot_config/channels/{clean_key}.json", method="DELETE")

    global _CHANNELS_CACHE, PERMANENT_CHANNELS
    PERMANENT_CHANNELS = [
        c for c in PERMANENT_CHANNELS if str(c.get("id")) != target_id and str(c.get("url")) != target_id
    ]
    _CHANNELS_CACHE = []
    load_channels()

    send_message(chat_id, f"🗑️ <b>Channel {target_id} Removed Successfully!</b>")


def handle_emojitest(chat_id, user: dict, message: dict):
    if not is_owner(user):
        send_message(chat_id, "❌ Permission denied!")
        return
    reply_msg = message.get("reply_to_message")
    if reply_msg:
        send_message(chat_id, "🧪 <b>TEST PREVIEW:</b> Niche aapka message copy hokar aa raha hai 👇")
        res = copy_message(chat_id, chat_id, reply_msg.get("message_id"))
        if res.get("ok"):
            send_message(
                chat_id,
                "✅ Agar upar custom animated emojis saaf dikh rahe hain, to is message ko reply karke <code>/broadcast</code> likhein!",
            )
        else:
            send_message(chat_id, f"⚠️ Test copy failed: {res.get('description')}")
    else:
        send_message(
            chat_id,
            "🧪 <b>EMOJI & MEDIA TEST GUIDE:</b>\n\n"
            "Apne premium animated emojis wale message ko <b>Reply</b> karein aur likhein: <code>/emojitest</code>",
        )


def handle_broadcast(chat_id, user: dict, message: dict):
    if not is_owner(user):
        return
    reply_msg = message.get("reply_to_message")
    full_text = message.get("text") or message.get("caption") or ""
    command_match = re.match(r"^/broadcast(@\w+)?\s*", full_text)
    prefix_len = command_match.end() if command_match else 0
    direct_text = full_text[prefix_len:].strip()

    if not reply_msg and not direct_text:
        send_message(
            chat_id,
            "📢 <b>PREMIUM BROADCAST GUIDE:</b>\n\n"
            "1. Apne custom emojis, photos, ya media wale message ko <b>Reply</b> karein aur likhein: <code>/broadcast</code>\n"
            "2. Direct text bhejne ke liye: <code>/broadcast &lt;message&gt;</code>",
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
        send_message(chat_id, "⚠️ Database me koi users nahi mile!")
        return

    send_message(chat_id, f"🚀 Broadcast shuru ho raha hai {len(valid_user_ids)} users ko...")

    sent = 0
    failed = 0
    for uid in valid_user_ids:
        if reply_msg:
            res = copy_message(uid, chat_id, reply_msg.get("message_id"))
        else:
            res = send_message(uid, direct_text)
            if not res.get("ok"):
                res = send_message(uid, direct_text, parse_mode="")
        if res.get("ok"):
            sent += 1
        else:
            failed += 1
        time.sleep(0.04)

    send_message(
        chat_id,
        f"✅ <b>Broadcast Completed!</b>\nDelivered: <b>{sent}</b> | Failed/Blocked: <b>{failed}</b>",
    )


# ---------------------------------------------------------------------------
# 10. UPDATE ROUTER & LONG-POLLING LOOP
# ---------------------------------------------------------------------------
def process_update(upd: dict):
    try:
        # 1. Handle Chat Join Request (Private Channels)
        if "chat_join_request" in upd:
            req = upd["chat_join_request"]
            user_id = str(req.get("from", {}).get("id", ""))
            chat_id = str(req.get("chat", {}).get("id", ""))
            if user_id and chat_id:
                record_channel_joined(user_id, chat_id)
                tg_api("approveChatJoinRequest", {"chat_id": chat_id, "user_id": int(user_id)})
            return

        # 2. Handle Callback Query (Inline Buttons)
        if "callback_query" in upd:
            query = upd["callback_query"]
            data = query.get("data") or ""
            if data.startswith("claim_"):
                handle_claim_callback(query)
            elif data.startswith("check_device_"):
                handle_check_device_callback(query)
            elif data == "my_invite":
                answer_callback_query(query.get("id"))
                chat_id = query.get("message", {}).get("chat", {}).get("id")
                handle_invite(chat_id, query.get("from") or {})
            return

        # 3. Handle Standard Messages & Commands
        msg = upd.get("message")
        if not msg:
            return

        chat_id = msg.get("chat", {}).get("id")
        user = msg.get("from") or {}
        text = (msg.get("text") or msg.get("caption") or "").strip()

        if not text.startswith("/"):
            return

        parts = text.split()
        cmd = parts[0].split("@")[0].lower()
        args = parts[1:]

        if cmd == "/start":
            handle_start(chat_id, user, args)
        elif cmd in ["/invite", "/refer"]:
            handle_invite(chat_id, user)
        elif cmd == "/help":
            handle_help(chat_id)
        elif cmd == "/ownerhelp":
            handle_ownerhelp(chat_id, user)
        elif cmd == "/stats":
            handle_stats(chat_id, user)
        elif cmd == "/channels":
            handle_channels(chat_id, user)
        elif cmd == "/addchannel":
            handle_addchannel(chat_id, user, args)
        elif cmd == "/removechannel":
            handle_removechannel(chat_id, user, args)
        elif cmd == "/emojitest":
            handle_emojitest(chat_id, user, msg)
        elif cmd == "/broadcast":
            handle_broadcast(chat_id, user, msg)
    except Exception as e:
        logger.error(f"Error processing update: {e}")


def main():
    logger.info("====================================================")
    logger.info("🚀 Starting Scratch The Win Bot (Pure Python Engine)")
    logger.info(f"🌐 Mini App URL: {WEB_URL}")
    logger.info("====================================================")

    # Start 24/7 HTTP Health Check Server
    t = threading.Thread(target=start_health_server, daemon=True)
    t.start()

    # Delete any active webhook & drop pending updates
    tg_api("deleteWebhook", {"drop_pending_updates": True})
    bot_me = get_bot_info()
    logger.info(f"✅ Bot Connected: @{bot_me.get('username', BOT_USERNAME)} (ID: {bot_me.get('id')})")

    offset = 0
    while True:
        try:
            res = tg_api(
                "getUpdates",
                {
                    "offset": offset,
                    "timeout": 25,
                    "allowed_updates": ["message", "callback_query", "chat_join_request"],
                },
                timeout=35,
            )
            if res.get("ok") and isinstance(res.get("result"), list):
                for upd in res["result"]:
                    offset = upd["update_id"] + 1
                    process_update(upd)
            else:
                desc = res.get("description", "")
                if "conflict" in str(desc).lower():
                    logger.warning("⚠️ Another bot instance is polling. Retrying in 5s...")
                    time.sleep(5)
                else:
                    time.sleep(2)
        except KeyboardInterrupt:
            logger.info("Bot stopped by user.")
            break
        except Exception as e:
            logger.warning(f"Polling loop notice: {e}. Retrying in 3s...")
            time.sleep(3)


if __name__ == "__main__":
    main()
