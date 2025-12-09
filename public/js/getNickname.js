/**
 * 닉네임 획득 (sessionStorage 또는 사용자 입력)
 * @returns {string} 검증된 닉네임
 */
export function getNickname() {
  const MIN_NICKNAME_LENGTH = 1;
  const MAX_NICKNAME_LENGTH = 20;
  const NICKNAME_REGEX = /^[가-힣a-zA-Z0-9_-]+$/;

  let nickname = sessionStorage.getItem('nickname');

  if (!nickname) {
    nickname = prompt('닉네임을 입력하세요:')?.trim();
  }

  // 닉네임 검증
  if (
    !nickname ||
    nickname.length < MIN_NICKNAME_LENGTH ||
    nickname.length > MAX_NICKNAME_LENGTH ||
    !NICKNAME_REGEX.test(nickname)
  ) {
    throw new Error(
      `닉네임은 1-20자의 한글, 영문, 숫자, -, _ 만 사용 가능합니다.`,
    );
  }

  sessionStorage.setItem('nickname', nickname);
  return nickname;
}
