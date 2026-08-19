# EEUM — 한일 진지한 관계 매칭

한일 진지한 관계를 위한 적응형 설문 및 관리자 매칭 분석 웹앱입니다.
Next.js와 Firebase Authentication/Firestore를 사용하며 Vercel 배포를 기준으로 구성되어 있습니다.

## Prerequisites

- Node.js `24.x`

## 로컬 실행

```bash
npm install
npm run dev
npm run build
```

## Firebase 설정

Firebase 프로젝트 `data-platform-b4587`에서 다음 항목을 활성화해야 합니다.

- Firestore Database
- Authentication > Sign-in method > Anonymous
- Authentication > Sign-in method > Google
- Authentication > Settings > Authorized domains에 `ondo-korea-japan-theta.vercel.app`

보안 규칙은 `firestore.rules`에 있습니다. 배포 전 Firebase CLI로 로그인한 뒤 실행합니다.

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore,auth
```

## 관리자

`/admin`에서 Google로 로그인합니다. 전체 응답 조회는
`kangbyeongyeon05@gmail.com`, `gim67507@gmail.com` 계정에만 허용됩니다.
