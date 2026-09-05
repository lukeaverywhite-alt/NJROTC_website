const menuButton = document.querySelector('.menu-toggle');
const menu = document.querySelector('.nav-links');

menuButton.addEventListener('click', () => {
  const isOpen = menu.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
});

menu.addEventListener('click', (event) => {
  if (event.target.matches('a')) {
    menu.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
  }
});

document.querySelector('#year').textContent = new Date().getFullYear();
