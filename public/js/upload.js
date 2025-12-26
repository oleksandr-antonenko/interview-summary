const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const processBtn = document.getElementById('processBtn');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const errorEl = document.getElementById('error');
const logoutBtn = document.getElementById('logoutBtn');

let files = [];

// Logout
logoutBtn.addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
});

// Drop zone events
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
  handleFiles(e.target.files);
  fileInput.value = '';
});

function handleFiles(newFiles) {
  for (const file of newFiles) {
    if (file.type.startsWith('audio/')) {
      files.push(file);
    }
  }
  renderFileList();
  updateProcessButton();
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function renderFileList() {
  fileList.innerHTML = '';

  files.forEach((file, index) => {
    const li = document.createElement('li');
    li.className = 'file-item';
    li.draggable = true;
    li.dataset.index = index;

    li.innerHTML = `
      <span class="handle">&#9776;</span>
      <span class="name">${file.name}</span>
      <span class="size">${formatSize(file.size)}</span>
      <span class="remove" data-index="${index}">&times;</span>
    `;

    // Drag events for reordering
    li.addEventListener('dragstart', handleDragStart);
    li.addEventListener('dragover', handleDragOver);
    li.addEventListener('drop', handleDrop);
    li.addEventListener('dragend', handleDragEnd);

    fileList.appendChild(li);
  });

  // Remove button events
  document.querySelectorAll('.file-item .remove').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      files.splice(index, 1);
      renderFileList();
      updateProcessButton();
    });
  });
}

let draggedIndex = null;

function handleDragStart(e) {
  draggedIndex = parseInt(e.target.dataset.index);
  e.target.classList.add('dragging');
}

function handleDragOver(e) {
  e.preventDefault();
}

function handleDrop(e) {
  e.preventDefault();
  const targetIndex = parseInt(e.target.closest('.file-item').dataset.index);

  if (draggedIndex !== null && draggedIndex !== targetIndex) {
    const draggedFile = files[draggedIndex];
    files.splice(draggedIndex, 1);
    files.splice(targetIndex, 0, draggedFile);
    renderFileList();
  }
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  draggedIndex = null;
}

function updateProcessButton() {
  processBtn.disabled = files.length === 0;
}

processBtn.addEventListener('click', async () => {
  if (files.length === 0) return;

  errorEl.style.display = 'none';
  processBtn.disabled = true;
  progressContainer.classList.add('active');
  progressFill.style.width = '0%';
  progressText.textContent = 'Uploading files...';

  const formData = new FormData();
  const language = document.getElementById('language').value;
  formData.append('language', language);
  files.forEach((file) => {
    formData.append('audio', file);
  });

  try {
    progressFill.style.width = '30%';
    progressText.textContent = 'Transcribing audio...';

    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Processing failed');
    }

    progressFill.style.width = '90%';
    progressText.textContent = 'Downloading result...';

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'interview-transcription.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    progressFill.style.width = '100%';
    progressText.textContent = 'Complete! File downloaded.';

    // Reset after a delay
    setTimeout(() => {
      files = [];
      renderFileList();
      updateProcessButton();
      progressContainer.classList.remove('active');
    }, 2000);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
    progressContainer.classList.remove('active');
    processBtn.disabled = false;
  }
});
