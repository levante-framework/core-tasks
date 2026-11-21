# How variant params get from the variant doc to the task launcher

Part of the [launch parameters assessment](../launch-params-assessment.md). The administration doc (highlighted) holds the copy of the variant's params that `startTask` returns at launch, so editing a variant later doesn't change assignments that already exist.

```mermaid
flowchart TD
    subgraph FS["Firestore"]
        VD["tasks/{taskId}/variants/{variantId}<br/>name, params, conditions"]
        AD["administrations/{adminId}<br/>assessments[]: taskId, variantId,<br/>variantName, params, conditions"]
        AS["users/{uid}/assignments/{adminId}<br/>assessments[], assigningOrgs, readOrgs"]
        UD["users/{uid}<br/>birthMonth, birthYear, userType, ..."]
    end

    subgraph CREATE["When the assignment is created (admin)"]
        CA["CreateAssignment.vue<br/>admin picks variants"]
        SA["submittedAssessments<br/>params: toRaw(variant.params)"]
        FK1["firekit.upsertAdministration()"]
        CF1["CF upsertAdministration<br/>stores assessments exactly as received"]
    end

    subgraph START["When the task starts (child)"]
        TL["TaskLevante.vue"]
        FK2["firekit.startAssessment(adminId, taskId, version, trialContainer)"]
        CF2["CF startTask<br/>1. check taskId is in assignment<br/>2. adminDoc.assessments.find(taskId)<br/>3. return params as variantParams"]
        AK["RoarAppkit<br/>_taskInfo.variantParams"]
        Q["useUserChildDataQuery"]
        GP["gameParams = { ...appKit._taskInfo.variantParams }"]
        UP["userParams = { birthMonth, birthYear }"]
        LT["new levanteTaskLauncher(appKit, gameParams, userParams, logger)"]
    end

    VD -->|"read for picker"| CA
    CA --> SA --> FK1 --> CF1
    CF1 -->|"copy of params saved"| AD
    AD -.->|"assignments created per user"| AS

    TL --> FK2 -->|"httpsCallable"| CF2
    AS -->|"existence check"| CF2
    AD -->|"params copy"| CF2
    UD -->|"userType, assessmentPid"| CF2
    CF2 -->|"taskInfo, assigningOrgs, readOrgs, userData"| FK2
    FK2 --> AK --> GP --> LT
    UD -->|"REST fetch, masked fields"| Q --> UP --> LT

    VD ~~~ AD
    classDef snapshot fill:#fff3cd,stroke:#b38f00
    class AD snapshot
```
