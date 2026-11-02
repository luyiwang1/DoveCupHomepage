(() => {
  const english = () => document.documentElement.lang.startsWith('en');
  function update(button, input) {
    const shown = input.type === 'text';
    button.textContent = english() ? (shown ? 'Hide' : 'Show') : (shown ? '隐藏' : '显示');
    button.setAttribute('aria-label', english() ? (shown ? 'Hide password' : 'Show password') : (shown ? '隐藏密码' : '显示密码'));
    button.setAttribute('aria-pressed', String(shown));
  }
  function enhance() {
    document.querySelectorAll('input[type="password"]').forEach(input => {
      if (input.closest('.password-control')) return;
      const wrapper = document.createElement('span');
      wrapper.className = 'password-control';
      input.before(wrapper);
      wrapper.append(input);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'password-visibility';
      button.addEventListener('click', () => {
        input.type = input.type === 'password' ? 'text' : 'password';
        update(button, input);
      });
      wrapper.append(button);
      update(button, input);
    });
  }
  new MutationObserver(enhance).observe(document.body, {childList: true, subtree: true});
  new MutationObserver(() => document.querySelectorAll('.password-control').forEach(wrapper => update(wrapper.querySelector('button'), wrapper.querySelector('input'))))
    .observe(document.documentElement, {attributes: true, attributeFilter: ['lang']});
  document.addEventListener('submit', event => {
    event.target.querySelectorAll('.password-control').forEach(wrapper => {
      const input = wrapper.querySelector('input');
      input.type = 'password';
      update(wrapper.querySelector('button'), input);
    });
  }, true);
  enhance();
})();
