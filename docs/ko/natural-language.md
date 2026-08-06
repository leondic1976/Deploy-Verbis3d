# 자연어 명령과 AI Provider 설정

Verbis3D의 자연어 기능은 AI가 만든 JavaScript를 실행하지 않습니다.

```text
자연어 → AIProvider → EngineCommand[] → 검증 → CommandBus → 공개 엔진 API
```

`eval`, `new Function`, 생성 스크립트 자동 실행은 사용하지 않습니다.

## 외부 서비스 없이 사용하기

```ts
const controller = engine.useNaturalLanguage({
  provider: new RuleBasedProvider(),
});

await controller.execute("파란 자동차를 만들어 오른쪽으로 2 이동하고 30도 회전");
```

오프라인 규칙은 box, sphere, plane, car, person, face, tree 생성을 지원합니다.

```text
빨간 구를 만들어 오른쪽으로 2 이동
파란 큐브 3개를 만들어
사람 얼굴을 만들어 두 배로 키워
자동차를 만들어 천천히 회전시켜
선택한 객체를 위로 1 이동
cube hide
```

현재 지원 의도는 생성, 선택, 이동, 회전, 크기, 색상, 표시/숨김, 회전 모션, 복제, 삭제입니다.
자유 대화나 복잡한 추론은 규칙 Provider의 범위가 아닙니다.

## 실행 전에 검증하기

```ts
const result = await controller.execute("자동차를 오른쪽으로 2 이동", {
  dryRun: true,
});
```

dry-run은 대상과 범위를 검사하지만 장면을 변경하지 않습니다. 삭제 권한은 별도로
활성화해야 하며, 같은 이름이 여러 개면 실행하지 않습니다.

## Ollama 연결

```ts
const controller = engine.useNaturalLanguage({
  provider: new OllamaProvider({
    model: "qwen3:8b",
    baseUrl: "http://127.0.0.1:11434",
  }),
});
```

브라우저에서 직접 접속할 때 Ollama가 실행 중이어야 하고 배포 사이트 origin을 CORS에서
허용해야 합니다. 연결 실패 메시지에는 endpoint와 점검 항목이 포함됩니다.

## OpenAI 호환 서버 연결

```ts
const controller = engine.useNaturalLanguage({
  provider: new OpenAICompatibleProvider({
    baseUrl: "https://provider.example/v1",
    model: "command-model",
    apiKey: sessionKey,
  }),
});
```

이 어댑터는 `/chat/completions` 형식과 JSON 응답을 기대합니다. 브라우저 번들에 장기 API
키를 넣지 마십시오. Playground 입력 키는 현재 탭 메모리에만 유지하지만, 실제 서비스는
서버 프록시가 키를 보관하고 인증·사용량 제한·감사를 수행해야 합니다.

## 직접 Provider 만들기

```ts
class DomainProvider implements AIProvider {
  async parseCommand(input: string, context: AICommandContext): Promise<EngineCommand[]> {
    if (input !== "주인공을 전진") throw new Error("지원하지 않는 문장입니다.");
    return [
      {
        version: "1.0",
        command: "moveObject",
        target: { name: context.selectedObjectName ?? "hero" },
        parameters: { x: 0, y: 0, z: -1, space: "world" },
      },
    ];
  }
}
```

Provider는 코드가 아니라 데이터만 반환해야 합니다. `CommandValidator`와 `CommandBus`를
우회하지 마십시오.

## 오류 읽는 법

| 코드                  | 의미                        | 해결 방법                            |
| --------------------- | --------------------------- | ------------------------------------ |
| `INVALID_SCHEMA`      | 필드 또는 타입 오류         | command/target/parameters 구조 확인  |
| `TARGET_NOT_FOUND`    | 대상 없음                   | 정확한 객체 이름 확인                |
| `AMBIGUOUS_TARGET`    | 같은 이름이 여러 개         | 객체 이름을 고유하게 변경            |
| `UNSUPPORTED_COMMAND` | 허용 목록 밖 명령           | 지원 command 사용                    |
| `OUT_OF_RANGE`        | 이동·회전·크기 제한 초과    | 값을 안전 범위로 축소                |
| `PERMISSION_DENIED`   | 삭제 등 권한 없음           | 필요한 범위에서 명시적으로 권한 설정 |
| `EXECUTION_FAILED`    | 실행 중 객체/재질 상태 오류 | 대상 타입과 파라미터 확인            |
