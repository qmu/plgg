---
layout: sheet
description: Follow Probability to Statistics. That prerequisite links the first year directly to the third.
---

# Course prerequisites

```plgg-flow fill dsl tools=hidden
layout rooms
axis SchoolYear Year1 Year2 Year3
axis Field Math Computing Applied
view x=SchoolYear y=Field
node Calculus SchoolYear=Year1 Field=Math
node LinearAlgebra SchoolYear=Year1 Field=Math
node Probability SchoolYear=Year1 Field=Math
node Programming SchoolYear=Year1 Field=Computing
node Optimization SchoolYear=Year2 Field=Math
node Algorithms SchoolYear=Year2 Field=Computing
node Database SchoolYear=Year2 Field=Computing
node Statistics SchoolYear=Year3 Field=Math
node MachineLearning SchoolYear=Year3 Field=Applied
node Retrieval SchoolYear=Year3 Field=Applied
Calculus -> Optimization
LinearAlgebra -> Optimization
Programming -> Algorithms
Programming -> Database
Probability -> Statistics
Optimization -> MachineLearning
Statistics -> MachineLearning
Algorithms -> Retrieval
Database -> Retrieval
mark "Probability -> Statistics"
```
