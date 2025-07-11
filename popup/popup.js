document.addEventListener('DOMContentLoaded', async () => {
  // 获取当前活动标签页
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = activeTab.id;
  
  // 显示目标网站信息
  document.getElementById('target-hostname').textContent = 
    new URL(activeTab.url).hostname;
  
  // 设置重新检测按钮
  const retryButton = document.getElementById('retry-button');
  retryButton.addEventListener('click', () => {
    // 发送重新检测请求
    chrome.tabs.sendMessage(tabId, { type: 'retry-detection' });
    
    // 更新UI显示检测中
    document.getElementById('match-status').textContent = '重新检测中...';
    document.getElementById('fingerprints-checked').textContent = '0';
    document.getElementById('matches-found').textContent = '0';
  });
  
  // 获取并显示结果
  fetchResults();
  
  // 添加结果监听器
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'cms-detection-result') {
      renderResults(message.result);
    }
  });
  
  async function fetchResults() {
    try {
      // 从background获取结果
      const results = await new Promise(resolve => {
        chrome.runtime.sendMessage(
          { type: 'get-cms-results', tabId },
          resolve
        );
      });
      
      // 渲染结果
      renderResults(results);
    } catch (error) {
      showError(`获取结果失败: ${error.message}`);
    }
  }
  
  function renderResults(results) {
    const container = document.getElementById('result-container');
    container.classList.remove('detected', 'not-detected', 'error');
    
    // 更新匹配信息
    document.getElementById('fingerprints-checked').textContent = 
      results.fingerprintsChecked || 0;
    
    document.getElementById('matches-found').textContent = 
      results.matchesFound || 0;
    
    if (results.error) {
      container.classList.add('error');
      document.getElementById('match-status').textContent = `错误: ${results.error}`;
      return;
    }
    
    if (results.detected) {
      container.classList.add('detected');
      document.getElementById('match-status').textContent = `检测到指纹`;
      
      // 创建CMS列表
      const cmsList = document.createElement('div');
      cmsList.className = 'cms-list';
      results.cmsList.forEach(cms => {
        const item = document.createElement('div');
        item.className = 'cms-item';
        item.textContent = cms;
        cmsList.appendChild(item);
      });
      
      // 添加到容器
      container.appendChild(cmsList);
    } else {
      container.classList.add('not-detected');
      document.getElementById('match-status').textContent = '未检测到指纹';
    }
  }
  
  function showError(message) {
    document.getElementById('match-status').textContent = message;
    document.getElementById('result-container').classList.add('error');
  }
});