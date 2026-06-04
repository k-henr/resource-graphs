#
# Runs both data building scripts in sequence.
#
import generateResources;
import packageConverters;

projNames = ["mindustry"]

for name in projNames:
    packageConverters.build(name)
    generateResources.build(name)
