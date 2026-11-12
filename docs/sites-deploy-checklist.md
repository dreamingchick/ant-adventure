# ChatGPT Sites 검수 배포 인계 — 개미의 모험

## 배포 대상
- 기존 Sites 프로젝트 ID: `appgprj_6af3b0b2c3fc81918fe012b55cc8bc46`
- 기존 검수 URL: https://ant-adventure-prototype.snugbrink3.chatgpt.site
- GitHub: `dreamingchick/ant-adventure`
- **검수 소스 브랜치**: `feature/chapter-02-kitchen`
- **고정 커밋**: `086d7aef1838bfd5928e5512cce9e8f808fd7519`
- 사이트 정적 배포 루트: `dist/` (저장소 내 `.openai/hosting.json`과 일치)

## 배포 범위
기존 검수 사이트에 CHAPTER 01 + CHAPTER 02를 같은 origin으로 함께 게시합니다. 소스는 `dist/index.html`, `dist/stage2.html`과 참조되는 모든 JS/CSS/이미지/PWA 파일을 포함해야 합니다. `main`은 현재 실행 파일이 없으므로 배포 대상으로 사용하면 안 됩니다.

## 검수 사항
1. 챕터1 매달림 구간의 개미가 천장에서 뒤집히지 않으며, 점선 뒤의 실제 구조물이 렌더링됩니다.
2. 챕터1의 보스 14회 피격·잔여 HP 보존·기존 게임 세이브를 확인합니다.
3. 챕터1 클리어 후 챕터2 입장 버튼으로 `stage2.html`이 열립니다.
4. 챕터2는 챕터1의 HUD/조작 버튼/색채 스타일을 따르며, 가시밭이 바닥 구간에 배치됩니다.
5. 같은 origin에서 `ant-adventure-save-v1` 키로 챕터2 잠금 해제가 됩니다. 별도 검수 사이트는 저장 데이터가 분리되므로 오판하지 않습니다.
6. 모바일 세로 물리방향과 가로 모드 각각에서 화면 중앙 정렬·멀티터치 검수합니다.
7. PWA `sw.js`의 기존 캐시가 이전 JS를 표시할 경우 업데이트 버튼으로 새 버전을 활성화합니다.

## 안전 기준
- 먼저 기존 검수 사이트에 게시하고 모바일 확인까지 마친 뒤 운영 승격을 판단합니다.
- 다른 게임 사이트, 오락실 대문 및 Vercel 프로젝트는 변경하지 않습니다.
- 기존 저장 키·PWA manifest id·scope를 바꾸지 않습니다.

## 자동 검증
GitHub Actions run: https://github.com/dreamingchick/ant-adventure/actions/runs/43158475578 — 42 tests passed.

**배포 상태: 실행 전**. Sites 게시/업데이트 권한이 있는 환경에서 이 체크리스트를 사용해 검수 사이트를 갱신해야 합니다.
