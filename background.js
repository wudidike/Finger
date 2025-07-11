// 指纹数据加载
let fingerprints = null;

async function loadFingerprints() {
  if (fingerprints) return fingerprints;
  
  try {
    const response = await fetch(chrome.runtime.getURL('fingerprints.json'));
    const data = await response.json();
    fingerprints = data.fingerprint;
    
    console.log("Fingerprints loaded:", fingerprints.length);
    return fingerprints;
  } catch (error) {
    console.error("Failed to load fingerprints:", error);
    return [];
  }
}

// 检测结果存储
const detectionResults = {};

// 指纹请求处理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;
  
  switch (message.type) {
    case 'get-fingerprints':
      loadFingerprints().then(fingerprints => {
        sendResponse({ fingerprints });
      });
      return true;
      
    case 'cms-detection-result':
      if (tabId) {
        detectionResults[tabId] = message.result;
        
        // 更新插件图标状态
        if (message.result.detected) {
          chrome.action.setBadgeText({ text: "✓", tabId });
          chrome.action.setBadgeBackgroundColor({ color: "#4CAF50", tabId });
        } else {
          chrome.action.setBadgeText({ text: "", tabId });
        }
      }
      break;
      
    case 'get-cms-results':
      const results = detectionResults[tabId] || {
        detected: false,
        hostname: tabId ? new URL(sender.tab.url).hostname : 'unknown'
      };
      sendResponse(results);
      break;
  }
  
  return true;
});

// 清理旧结果
chrome.tabs.onRemoved.addListener(tabId => delete detectionResults[tabId]);
chrome.tabs.onUpdated.addListener(tabId => {
  delete detectionResults[tabId];
  chrome.action.setBadgeText({ text: "", tabId });
});

// 初始化
loadFingerprints();
console.log("Background service started");