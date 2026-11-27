---
layout: sheet
description: Start at a screen and follow its dependencies through the view model to the components that handle networking and storage.
---

# A mobile app using MVVM

```plgg-flow fill dsl tools=hidden
layout layered down
axis Layer View ViewModel Repository Sources
node ListScreen Layer=View
node DetailScreen Layer=View
node SettingsScreen Layer=View
node ListVM Layer=ViewModel
node DetailVM Layer=ViewModel
node SettingsVM Layer=ViewModel
node ProductRepository Layer=Repository
node SettingsRepository Layer=Repository
node APIClient Layer=Sources
node LocalDB Layer=Sources
node ConfigFile Layer=Sources
ListScreen -> ListVM
DetailScreen -> DetailVM
SettingsScreen -> SettingsVM
ListVM -> ProductRepository
DetailVM -> ProductRepository
SettingsVM -> SettingsRepository
ProductRepository -> APIClient
ProductRepository -> LocalDB
SettingsRepository -> ConfigFile
```
