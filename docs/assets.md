# 자산 기록

- `dist/assets/ant-original.webp`: 사용자가 만든 기존 〈챠챠, 씻으러 가자〉의 ‘장난꾸러기 밤색 개미 4종 스프라이트.png’ 원본. 원본 구성을 유지해 WebP로 최적화하고 Canvas 소스 사각형으로 포즈를 선택한다.
- `dist/assets/living-room.webp`: 같은 작품의 ‘세이지 소파의 햇살 가득한 거실.png’ 원본. 패럴랙스 배경으로 사용한다.
- `dist/assets/grasshoppers.webp`: 사용자 첨부 `35180.png`의 뚱뚱한·마른·평범한·똑똑한 베짱이 디자인을 참조해 내장 이미지 생성으로 준비한 투명 2×2 아틀라스. 캐릭터 외형을 유지하고 문구·잎·가지·손 소품을 제거했다. Canvas에서 셀을 선택하며, 이동·경직·경고·공격은 게임 코드가 표현한다. 대장은 뚱뚱한 베짱이를 크게 표시하고 왕관 표식을 추가한 프로토타입 표현이다. 전용 보스 그림과 동작별 적 프레임은 후속 개선 대상이다.
- 발판·장난감 블록·실밥·발자국·챠챠 앞발·설탕·꿀방울·쉼터는 Canvas로 그린다. 챠챠 앞발은 장애물 프로토타입이며 기존 챠챠 전신 스프라이트를 대신하는 신규 캐릭터 디자인이 아니다.
- 음악·효과음은 Web Audio 합성이다. 짧은 침·피격 소리와 화면 감탄사를 사용하며, 녹음한 캐릭터 음성은 포함하지 않는다.

## 베짱이 아틀라스 제작 프롬프트

Use case: background-extraction. Asset type: 2D platform game enemy sprite atlas, preserve the attached four grasshopper character identities exactly. Produce a square 2 by 2 equal-cell sprite sheet on actual transparent background. Top-left FAT grasshopper with round belly and smug sleepy face; top-right SKINNY grasshopper with narrow body and nervous face; bottom-left NORMAL cheerful grasshopper; bottom-right SMART grasshopper with exposed brainlike head and round spectacles. Each whole character centered in its own cell, all facing LEFT or left three-quarter view, standing pose with feet aligned at 90 percent of each cell height. Keep entire antennae and legs inside cell with 6 percent padding, clear empty gutters. Keep the soft polished 3D cartoon style and green colors from reference. Remove all Korean text, white background, apple, branch, leaf platforms, parchment, feather and other held props. Only characters, no lettering, no ground, no cast background. Four equally sized cells suitable for canvas source-rectangle rendering.


## 설치형 웹앱 아이콘

`dist/icons/`의 PNG 4종은 기존 개미의 첫 번째 포즈를 참조해 만든 단일 정사각형 앱 아이콘을 각 설치 규격으로 내보낸 결과다. 원본 개미 스프라이트는 교체하지 않았다. 내장 이미지 생성으로 제작했다.

제작 프롬프트: Square mobile game app icon for Ant Adventure. Use only the friendly mischievous brown ant in the top-left cell as the exact character identity. Single large head and a little upper body facing right three-quarter, big brown eyes, warm orange-brown face, cute confident smile, both thick curved antennae intact. Soft polished 3D cartoon render matching reference. Deep sage green background with gentle warm circular glow. Full bleed square, no rounded corners, no borders, no lettering, no extra insects or sprite grid. Keep recognisable face and antennae in central 70 percent square safe zone. High legibility at 192 pixels.
