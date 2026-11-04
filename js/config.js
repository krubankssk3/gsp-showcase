/* =========================================================
   config.js — ตั้งค่าการเชื่อมต่อ
   - ว่าง API_URL ไว้ = ทำงานในโหมดสาธิต (ข้อมูลตัวอย่างในเบราว์เซอร์)
   - ใส่ URL /exec ของ Google Apps Script แล้วตั้ง DEMO: false = ใช้งานจริง
   ========================================================= */
var CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbzBg54xtDeqnu7HTXoGC8A1k8AluPjZ5z5Sac7sJ0azUFDCwGXGFVmPu38TbhE5zt4g/exec',
  DEMO: false,
  SYSTEM_NAME: "ผลงานการแข่งขันสร้างสรรค์ผลงานคณิตศาสตร์โดยใช้โปรแกรม The Geometer's Sketchpad (GSP)",
  SHORT_NAME: 'GSP Showcase',
  MAX_UPLOAD_MB: 15,
  /* นามสกุลไฟล์ของโปรแกรม The Geometer's Sketchpad */
  GSP_EXT: ['gsp', 'gsp4', 'gsp5', 'gsp6'],
  /* นามสกุลไฟล์ที่อนุญาตให้อัปโหลด (นอกจากรูปภาพ) */
  ALLOWED_EXT: ['gsp', 'gsp4', 'gsp5', 'gsp6', 'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'zip', 'rar', '7z', 'mp4', 'mov', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'txt']
};
