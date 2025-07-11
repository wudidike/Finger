// 高级CMS检测函数
async function detectCMS() {
  try {
    // 获取指纹数据
    const { fingerprints } = await chrome.runtime.sendMessage({ type: 'get-fingerprints' });
    
    if (!fingerprints || fingerprints.length === 0) {
      console.warn("No fingerprints available");
      return {
        detected: false,
        error: "No fingerprint data"
      };
    }
    
    // 获取页面内容（大小写不敏感）
    const htmlContent = document.documentElement.outerHTML.toLowerCase();
    const detectedCMS = new Set();
    
    // 调试变量：统计匹配情况
    let matchesFound = 0;
    
    // 高级匹配逻辑
    fingerprints.forEach(rule => {
      if (rule.location === 'body') {
        // 检查所有关键词是否都出现（大小写不敏感）
        const allKeywordsPresent = rule.keyword.every(kw => 
          htmlContent.includes(kw.toLowerCase())
        );
        
        if (allKeywordsPresent) {
          detectedCMS.add(rule.cms);
          matchesFound++;
        }
      }
    });
    
    console.log(`Detected ${matchesFound} matches out of ${fingerprints.length} fingerprints`);
    
    return {
      detected: detectedCMS.size > 0,
      cmsList: Array.from(detectedCMS),
      hostname: window.location.hostname,
      matchesFound,
      fingerprintsChecked: fingerprints.length
    };
  } catch (error) {
    console.error("Detection failed:", error);
    return {
      detected: false,
      error: error.message,
      hostname: window.location.hostname
    };
  }
}

// 多阶段检测机制
async function runDetection() {
  let result;
  
  // 第一次尝试：页面加载后立即检测
  result = await detectCMS();
  
  if (!result.detected) {
    // 第二次尝试：等待2秒后检测（给动态内容时间加载）
    await new Promise(resolve => setTimeout(resolve, 2000));
    result = await detectCMS();
  }
  
  // 发送最终结果
  chrome.runtime.sendMessage({
    type: 'cms-detection-result',
    result: {
      ...result,
      timestamp: new Date().toISOString()
    }
  });
  
  // 在控制台显示调试信息
  if (result.detected) {
    console.log("Detected CMS:", result.cmsList.join(", "));
  } else {
    console.log("No fingerprint detected");
    
    // 添加详细调试信息
    const htmlContent = document.documentElement.outerHTML;
    console.log("HTML content snippet:", htmlContent.substring(0, 500) + "...");
  }
}

// 页面加载完成后启动检测
window.addEventListener('DOMContentLoaded', () => {
  // 延迟执行确保DOM完全加载
  setTimeout(runDetection, 1000);
});

// 添加手动重新检测功能
chrome.runtime.onMessage.addListener(message => {
  if (message.type === 'retry-detection') {
    setTimeout(runDetection, 500);
  }
});