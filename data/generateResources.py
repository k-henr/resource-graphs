#
# A script for generating resources just from the image files
#
import os;
import json;
import re;

# Matches id_and_name.unitGroup.#tag1.tag2.tag3#.ext
# The unit group and tag list are optional. Dots are used to separate parts of the
# filename. The id_and_name part will be used to generate both the id and the name
resourceMatcher = re.compile(r"^(?P<ID>[^\.]*)\.(?:(?P<UNIT>[^\.\+]+)\.)?(?:\+(?P<TAGS>.+)\+\.)?\w+$")
# Matches whole paths for unit groups and tags imparted by individual folders
folderMatcher = re.compile(r"(?<=[\/\\])[^\\\/\.]*(?:\.(?P<UNIT>[^\\\/\.\+]+))?(?:\.\+(?P<TAGS>[^\/\+]+)\+)?")

def build(
    projName,
    sourceDir = "images/resources",
    output = "resources.json",
    capitalizeDisplayNames = True
):
    # Go through a list of all files in the input directory
    allResources = []
    warnings = []
    projPath = os.path.join(os.getcwd(), "data", projName)
    srcPath = os.path.join(projPath, sourceDir)

    for path, _, files in os.walk(srcPath):
        # Get the relative path for the images in this folder
        imgPath = os.path.relpath(path, srcPath)

        # look for any unit group defaults or tags imparted by the path
        defaultUnitGroup = None
        defaultTags = []
        unit: str
        tags:str
        for [unit, tags] in folderMatcher.findall(path):
            if unit != "": defaultUnitGroup = unit
            if tags != "":
                for t in tags.split("."):
                    defaultTags.append(t)

        for filename in files:
            # print(f"Found resource image: {filename}")

            # Regex the filename to get the different parts
            match = resourceMatcher.search(filename)
            if(match == None):
                warnings.append(f"Filename '{filename}' failed the match!")
                continue

            name = match.group("ID").replace("_", " ")
            if capitalizeDisplayNames: name = name.title()

            # Make the basic resource structure
            resource = {
                "id": match.group("ID"),
                "displayName": name,
                "displayImage": f"{sourceDir}/{imgPath + "/" if imgPath != "." else ""}{filename}".replace("\\","/"),
            }

            # Add unit group if exists
            if(group := match.group("UNIT")): resource["unitGroup"] = group
            elif defaultUnitGroup: resource["unitGroup"] = defaultUnitGroup

            # Add tags if any
            if((tags := match.group("TAGS")) or len(defaultTags) != 0):
                if(tags == None):
                    resource["tags"] = defaultTags
                else:
                    resource["tags"] = tags.split(".")
                    resource["tags"].extend(defaultTags)

            # Add to list of all resources
            allResources.append(resource)

    # If there are warnings, print them out and don't continue
    if(len(warnings) != 0):
        print("### WARNINGS ENCOUNTERED: ###")
        for w in warnings:
            print("> " + w)
        print("Script finished with warnings, file wasn't written.")

    # If no warnings were encountered, stringify the json and output to file
    else:
        print("Parsing successful, writing output...")
        outputText = json.dumps(allResources, separators=(",",":"), ensure_ascii=False)
        with open(os.path.join(projPath, output), "w", encoding="utf-8") as outputFile:
            outputFile.write(outputText)
        print("Script finished successfully.")
