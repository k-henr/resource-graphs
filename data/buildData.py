#
# Runs both data building scripts in sequence.
#
import generateResources;
import packageConverters;

projNames = ["oxygennotincluded"]

for name in projNames:
    packageConverters.build(name)
    print("\n")
    # generateResources.build(name)
    #todo: recap of all warnings
