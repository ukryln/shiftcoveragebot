"use client";

import { useState } from "react";

export function ConnectTelegram({
  userId,
  botUsername,
  isConnected,
}: {
  userId: string;
  botUsername: string;
  isConnected: boolean;
}) {
  const [showLink, setShowLink] = useState(false);
  const [copied, setCopied] = useState(false);

  const link = `https://t.me/${botUsername}?start=manager_${userId}`;

  function handleShowLink() {
    setShowLink(true);
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }, () => {});
  }

  if (isConnected && !showLink) {
    return (
      <div className="mt-4">
        <p className="text-sm text-green-700">✓ Telegram connected</p>
        <button onClick={handleShowLink} className="mt-1 text-xs text-blue-600 underline">
          Get link again
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {!showLink && (
        <button onClick={handleShowLink} className="text-sm text-blue-600 underline">
          Connect Telegram
        </button>
      )}
      {showLink && (
        <div className="mt-1">
          <p className="text-xs text-gray-500">
            Open this link and tap Start to get coverage-request notifications:
          </p>
          <div className="mt-1 flex items-center gap-2">
            <input
              readOnly
              value={link}
              onFocus={(e) => e.target.select()}
              className="w-72 rounded border border-gray-300 px-1 py-0.5 text-xs text-gray-700"
            />
            {copied && <span className="text-xs text-green-700">Copied!</span>}
          </div>
        </div>
      )}
    </div>
  );
}
