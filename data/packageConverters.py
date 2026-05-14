#
# A script for packaging unpacked converter data into a single file
#
import os;
import json;

projName = "oxygennotincluded"
unpackedDir = "unpacked_converters"
output = "converters.json"
defaultImgPath = "images/converters"
defaultImgExt = "png"
capitalizeDisplayNames = True

# Go through a list of all files in the input directory
allConverters = []
warnings = []
projPath = os.path.join(os.getcwd(), "data", projName)
unpackedPath = os.path.join(projPath, unpackedDir)
for filename in os.listdir(unpackedPath):
    print(f"Found converter: {filename}")
    with open(os.path.join(unpackedPath, filename)) as file:
        # Parse file
        converter = json.loads(file.read())

        # If the ID isn't set, set ID to the file name (without extension)
        if(not "id" in converter):
            converter["id"] = filename.replace(".json", "")

        # If no display name set, set display name to the file name (replacing _ with spaces and potentially capitalizing words)
        if(not "displayName" in converter):
            temp = converter["id"].replace("_", " ")
            converter["displayName"] = temp.title() if capitalizeDisplayNames else temp

        # If no image set, set image to the ID
        if(not "displayImage" in converter):
            converter["displayImage"] = f"{defaultImgPath}/{converter["id"]}.{defaultImgExt}"

        # If other fields are missing, add a warning to be printed out
        print("TODO: Warn when other fields are missing")
        if(not ("consumes" in converter and "produces" in converter)):
            warnings.append(f"{filename} is missing a production or consumption list!")

        # Add to a list of all converters
        allConverters.append(converter)

# If there are warnings, print them out and don't continue
if(len(warnings) != 0):
    print("### WARNINGS ENCOUNTERED: ###")
    for w in warnings:
        print("> " + w)
    print("Script finished with warnings, file wasn't written.")

# If no warnings were encountered, stringify the json and output to file
else:
    print("Parsing successful, writing output...")
    outputText = json.dumps(allConverters, separators=[",",":"])
    with open(os.path.join(projPath, output), "w") as outputFile:
        outputFile.write(outputText)
    print("Script finished successfully.")
