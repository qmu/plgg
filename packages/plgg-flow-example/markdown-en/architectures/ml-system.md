---
layout: sheet
description: Follow the feature store’s connections to training and inference, then find the path from monitoring back to training.
---

# A machine learning system

```plgg-flow fill dsl tools=hidden
layout layered down
axis Layer Data Features Training Serving Monitoring
node Events Layer=Data
node ProductCatalog Layer=Data
node FeatureStore Layer=Features
node TrainingJob Layer=Training
node ModelRegistry Layer=Training
node InferenceAPI Layer=Serving
node Recommendations Layer=Serving
node AccuracyMonitor Layer=Monitoring
node DataMonitor Layer=Monitoring
Events -> FeatureStore
ProductCatalog -> FeatureStore
FeatureStore -> TrainingJob
TrainingJob -> ModelRegistry
ModelRegistry -> InferenceAPI
FeatureStore -> InferenceAPI
InferenceAPI -> Recommendations
InferenceAPI -> AccuracyMonitor
Events -> DataMonitor
AccuracyMonitor -> TrainingJob
```
