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

def build(
    projName,
    imageDir = "images/resources",
    output = "resources.json",
    capitalizeDisplayNames = True
):
    # Go through a list of all files in the input directory
    allResources = []
    warnings = []
    projPath = os.path.join(os.getcwd(), "data", projName)
    imagePath = os.path.join(projPath, imageDir)
    for filename in os.listdir(imagePath):
        print(f"Found resource image: {filename}")

        # Regex the filename to get the different parts
        match = resourceMatcher.search(filename)
        if(match == None):
            warnings.append(f"Filename '{filename}' failed the match!")
            continue

        name = match.group("ID").replace("_", " ")
        if capitalizeDisplayNames: name = name.title()

        # Make the resource structure
        resource = {
            "id": match.group("ID"),
            "displayName": name,
            "displayImage": f"{imageDir}/{filename}",
        }

        # Add unit group if exists
        if(group := match.group("UNIT")): resource["unitGroup"] = group

        # Add tags if any
        if(tags := match.group("TAGS")):
            tagList = tags.split(".")
            resource["tags"] = tagList

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
        outputText = json.dumps(allResources, separators=[",",":"], ensure_ascii=False)
        with open(os.path.join(projPath, output), "w", encoding="utf-8") as outputFile:
            outputFile.write(outputText)
        print("Script finished successfully.")
