from flask import Flask, request, jsonify
from slack_sdk import WebClient
import os

SLACK_BOT_TOKEN = os.environ["SLACK_BOT_TOKEN"]
client = WebClient(token=SLACK_BOT_TOKEN)

app = Flask(__name__)

@app.route("/slack/events", methods=["POST"])
def slack_events():
    data = request.json
    print("🔍 Slack sent:", data)

    if "challenge" in data:
        return data["challenge"], 200, {"Content-Type": "text/plain"}

    if "event" in data:
        event = data["event"]
        if event.get("type") == "reaction_added":
            print("💥 Reaction added!", event["reaction"])  # debug

            if event["reaction"] == "pencil2":
                print("📝 Pencil2 reaction detected!")
                channel = event["item"]["channel"]
                ts = event["item"]["ts"]

                client.chat_postMessage(
                    channel=channel,
                    thread_ts=ts,
                    text="🪄 Got it! Starting Spell Shock magic..."
                )

    return "", 200

if __name__ == "__main__":
    app.run(port=3000)

