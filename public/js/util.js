export function createDialog({
  title,
  message,
  confirmText = '확인',
  onConfirm = () => {},
  onCancel = () => {},
  isDanger = false,
}) {
  const dialog = document.createElement('dialog');
  dialog.className = 'confirm-dialog';

  const content = document.createElement('div');
  content.className = 'dialog-content';

  const titleEl = document.createElement('h2');
  titleEl.textContent = title;

  const messageEl = document.createElement('p');
  messageEl.textContent = message;

  const confirmBtn = document.createElement('button');
  confirmBtn.className = isDanger ? 'btn-danger' : 'btn-primary';
  confirmBtn.textContent = confirmText;

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn-secondary';
  cancelBtn.textContent = '취소';

  content.append(titleEl, messageEl, confirmBtn, cancelBtn);
  dialog.appendChild(content);
  document.body.appendChild(dialog);

  const finish = (cb) => {
    if (typeof cb === 'function') cb();
    if (dialog.open) dialog.close();
  };

  const onConfirmHandler = () => finish(onConfirm);
  const onCancelHandler = () => finish(onCancel);

  confirmBtn.addEventListener('click', onConfirmHandler);
  cancelBtn.addEventListener('click', onCancelHandler);

  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    onCancelHandler();
  });

  dialog.addEventListener('click', (e) => {
    const rect = content.getBoundingClientRect();
    const inside =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    if (!inside) onCancelHandler();
  });

  dialog.addEventListener('close', () => {
    confirmBtn.removeEventListener('click', onConfirmHandler);
    cancelBtn.removeEventListener('click', onCancelHandler);
    dialog.remove();
  });

  dialog.showModal();
  return dialog;
}
//토스트 메시지 만드는 함수
export function createToast(message, duration = 3000) {
  const container = document.getElementById('toast-container');

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duration);
}
