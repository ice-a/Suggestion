document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.panel');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(`${target}-panel`).classList.add('active');
    });
  });

  const API_BASE = '';
  const toBase64 = (str) => btoa(unescape(encodeURIComponent(str)));

  const getDeviceInfo = async () => {
    const getHardwareInfo = async () => {
      try {
        if (navigator.hardwareConcurrency || navigator.deviceMemory) {
          const nav = navigator;
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
          const debugInfo = gl ? gl.getExtension('WEBGL_debug_renderer_info') : null;
          const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
          
          return {
            cpuCores: nav.hardwareConcurrency || '',
            deviceMemory: nav.deviceMemory ? `${nav.deviceMemory}GB` : '',
            gpu: renderer || '',
            hardDisk: ''
          };
        }
      } catch (e) {}
      return { cpuCores: '', deviceMemory: '', gpu: '', hardDisk: '' };
    };
    
    const hardware = await getHardwareInfo();
    const info = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenWidth: screen.width,
      screenHeight: screen.height,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cpuCores: hardware.cpuCores,
      deviceMemory: hardware.deviceMemory,
      gpu: hardware.gpu,
      hardDisk: hardware.hardDisk
    };
    return JSON.stringify(info);
  };

  document.getElementById('suggestion-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '提交中...';
    submitBtn.disabled = true;
    
    const title = document.getElementById('title').value;
    const type = document.getElementById('type').value;
    const text = document.getElementById('text').value;
    
    if (!title || !type || !text) {
      alert('请填写所有必填字段');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      return;
    }
    
    try {
      const deviceInfo = getDeviceInfo();
      const payload = { 
        title: toBase64(title), 
        type: type, 
        text: toBase64(text),
        deviceInfo: toBase64(deviceInfo)
      };
      
      console.log('Sending:', payload);
      
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      console.log('Response:', res.status, data);
      
      if (res.ok && data.id) {
        document.getElementById('suggestion-id').textContent = data.id;
        document.getElementById('submit-result').style.display = 'block';
        document.getElementById('suggestion-form').reset();
        alert('提交成功！ID: ' + data.id);
      } else {
        alert((data && data.error) || '提交失败，请重试');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('网络错误: ' + err.message);
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });

  document.getElementById('query-btn').addEventListener('click', async () => {
    const id = document.getElementById('query-id').value.trim();
    
    if (!id) {
      alert('请输入查询ID');
      return;
    }
    
    try {
      const res = await fetch(`/api/suggestions/${id}`);
      const data = await res.json();
      
      if (res.ok) {
        document.getElementById('detail-title').textContent = data.title;
        document.getElementById('detail-type').textContent = data.type;
        document.getElementById('detail-text').textContent = data.text;
        
        const statusEl = document.getElementById('detail-status');
        statusEl.textContent = data.status;
        statusEl.className = `status-badge ${data.status}`;
        
        document.getElementById('progress-fill').style.width = `${data.progress}%`;
        document.getElementById('progress-text').textContent = `${data.progress}%`;
        
        document.getElementById('query-result').style.display = 'block';
      } else {
        alert(data.error || '查询失败');
        document.getElementById('query-result').style.display = 'none';
      }
    } catch (err) {
      alert('网络错误，请稍后重试');
    }
  });
});
