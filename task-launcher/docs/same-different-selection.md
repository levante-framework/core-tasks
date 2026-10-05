# Same-Different Selection (`sameDifferentSelection`)

Timeline source: `src/tasks/same-different-selection/`. See the [README](README.md) for the legend and shared conventions.

## Non-CAT

```mermaid
flowchart TD
    START([START]) --> FILT{"version 2 &<br/>not heavyInstructions?"}
    FILT -- yes --> RM[Drop something-same test items] --> BLOCKS
    FILT -- no --> BLOCKS[Group items into blocks by type]

    BLOCKS --> OP{Item type}
    OP -- test-dimensions --> TD[Item → feedback]
    OP -- something-same --> SS[Item → feedback → button sound]
    OP -- match --> MA[Matching item → feedback → button sound]

    TD --> NEXT
    SS --> NEXT
    MA --> NEXT{More items?}
    NEXT -- yes --> OP
    NEXT -- no --> END([END])
```

Feedback and the button sound run only for some item types and stages.

## CAT

```mermaid
flowchart TD
    START([START]) --> B0

    subgraph BLOCK0["Test-dimensions block"]
        B0["Instructions and practice<br/>(feedback on practice)"] --> T0[Adaptive items]
    end

    T0 --> B1

    subgraph BLOCK1["Something-same block"]
        B1[Instructions and practice] --> SKIP1{"version 2 &<br/>not heavyInstructions?"}
        SKIP1 -- no --> T1[Adaptive item pairs → button sound]
    end

    SKIP1 -- yes: skip test items --> B2
    T1 --> B2

    subgraph BLOCK2["Match block"]
        B2[Instructions and practice] --> T2[Pick next adaptive item]
        T2 --> FIVE{"Needs an extra intro?<br/>(version 2, largest match size)"}
        FIVE -- yes --> FI[Extra intro] --> M
        FIVE -- no --> M[Matching item → button sound]
        M --> R2{More items?}
        R2 -- yes --> T2
    end

    R2 -- no --> END([END])
```
