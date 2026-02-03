import React, { useState } from "react";
import { updateGlobalMessage } from "../../redux/reducer";

export default function BroadcastControl() {
    const [message, setMessage] = useState("");
    const [status, setStatus] = useState("idle");

    const handlePublish = async () => {
        setStatus("submitting");
        const res = await updateGlobalMessage(message)();
        if (res.success) {
            setStatus("success");
            alert("Global message updated!");
            setMessage("");
        } else {
            setStatus("error");
            alert("Error: " + res.error);
        }
        setStatus("idle");
    };

    const handleClear = async () => {
        if (!window.confirm("Remove global message?")) return;
        const res = await updateGlobalMessage(null)();
        if (res.success) alert("Message cleared");
    };

    return (
        <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-white mb-6">Global Announcement System</h2>
            <p className="text-gray-400 mb-8">
                Send a message to all users instantly. It will appear as a banner at the top of the Home Dashboard.
            </p>

            <div className="relative mb-8">
                <textarea
                    className="w-full h-32 bg-black border border-gray-700 rounded-xl p-4 text-white text-lg focus:border-red-500 outline-none resize-none"
                    placeholder="e.g. 'Predictions for Monaco GP close in 1 hour!'"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
                <div className="absolute bottom-4 right-4 text-xs text-gray-500">
                    {message.length} chars
                </div>
            </div>

            <div className="flex justify-center space-x-4">
                <button
                    onClick={handleClear}
                    className="px-6 py-2 rounded-lg border border-gray-600 text-gray-400 hover:text-white hover:border-white transition-all font-bold"
                >
                    Clear Message
                </button>
                <button
                    onClick={handlePublish}
                    disabled={!message || status === "submitting"}
                    className="px-8 py-2 rounded-lg bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold shadow-lg shadow-red-900/40 transition-all transform hover:-translate-y-1"
                >
                    {status === "submitting" ? "Publishing..." : "Broadcast Now"}
                </button>
            </div>
        </div>
    );
}
