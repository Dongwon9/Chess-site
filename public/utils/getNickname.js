export default function getNickname() {
  let nickname = sessionStorage.getItem('nickname');
  if (nickname) {
    return nickname;
  }
  while (!nickname) {
    nickname = prompt('닉네임을 입력하세요:');
  }
  sessionStorage.setItem('nickname', nickname);
  return nickname;
}
