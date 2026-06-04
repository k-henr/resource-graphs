#
# A script for packaging unpacked converter data into a single file
#
import os;
import json;
import re;

class ParseException(BaseException):
    def __init__(self, message):
        self.message = message

type jsonObject = dict[str, jsonObject] | str | list[jsonObject] | float | int | bool

templateStringMatcher = re.compile(r"^(?P<FLATTENLIST>\.\.\.)?TEMPLATE(?P<OPTIONAL>\?)?:(?P<TEMPLATENAME>\w+)$")

def build(
    projName,
    unpackedDir = "unpacked-converters",
    output = "converters.json",
    templateDir = "templates",
    defaultImgDir = "images/converters",
    defaultImgExt = "png",
    capitalizeDisplayNames = True
):
    # Go through a list of all files in the input directory
    allConverters = []
    warnings = []
    projectPath = os.path.join(os.getcwd(), "data", projName)
    unpackedPath = os.path.join(projectPath, unpackedDir)
    for filename in os.listdir(unpackedPath):
        print(f"Found converter: {filename}")
        with open(os.path.join(unpackedPath, filename), encoding="utf-8") as file:
            # Parse file
            converter = json.loads(file.read())
            try:
                allConverters.append(parseConverter(
                    converter,
                    filename,
                    capitalizeDisplayNames,
                    templateDir,
                    defaultImgDir,
                    defaultImgExt,
                    projectPath
                ))
            except ParseException as e:
                warnings.append(e.message)

    # If there are warnings, print them out and don't continue
    if(len(warnings) != 0):
        print("### WARNINGS ENCOUNTERED: ###")
        for w in warnings:
            print("> " + w)
        print("Script finished with warnings, file wasn't written.")

    # If no warnings were encountered, stringify the json and output to file
    else:
        print("Parsing successful, writing output...")
        outputText = json.dumps(allConverters, separators=(",",":"), ensure_ascii=False)
        with open(os.path.join(projectPath, output), "w", encoding="utf-8") as outputFile:
            outputFile.write(outputText)
        print("Script finished successfully.")

def parseConverter(
    converter: jsonObject,
    filename: str,
    capitalizeDisplayNames: bool,
    templateDir: str,
    defaultImgPath: str,
    defaultImgExt: str,
    projectPath: str
) -> jsonObject:
    if type(converter) is dict:
        
        # If this is a template implementation, resolve that template
        if "templateName" in converter:
            print(f"Resolving template {converter["templateName"]}")

            # Define a function for parsing this converter and resolving all template
            # strings. Recursively walks through the tree looking for any template
            # strings to replace
            # Returns the processed element as well as a flag for if the template
            # should be flattened into parent lists (only if the return type is a
            # list!)
            def resolveTemplate(templateObject: jsonObject) -> tuple[jsonObject, bool] | None:
                match templateObject:
                    case bool() | int() | float():
                        return (templateObject, False)
                    case dict():
                        outputDict:dict[str, jsonObject] = {}
                        for key,value in templateObject.items():
                            tuple = resolveTemplate(value)
                            if tuple != None: outputDict[key] = tuple[0]
                        return (outputDict, False)
                    case list():
                        outputList: list = []
                        for v in templateObject:
                            tuple = resolveTemplate(v)
                            if tuple == None: continue
                            child = tuple[0]
                            # Flatten lists into the parent if the template said so
                            if tuple[1] and type(child) is list:
                                for v in child: outputList.append(v)
                            else: outputList.append(child)
                        return (outputList, False)
                    case str():
                        if(match := re.match(templateStringMatcher, templateObject)):
                            content = converter.get(match.group("TEMPLATENAME"))

                            if(content == None):
                                if match.group("OPTIONAL"): return None
                                raise ParseException(f"Template replacer '{match.group("TEMPLATENAME")}' missing on implementation in '{filename}'!")
                            
                            print(f"Replacing {templateObject} with {content}")

                            return (content, bool(match.group("FLATTENLIST")))
                        else:
                            return (templateObject, False)
                raise ParseException(f"Unknown json type {type(templateObject)}!")
                    
            # Load template file
            with open(os.path.join(projectPath, templateDir, f"{converter["templateName"]}.json"), encoding="utf-8") as templateFile:
                template: tuple[jsonObject, bool] | None = resolveTemplate(json.loads(templateFile.read()))

                if(not template): raise ParseException("Template parsing resulted in None!")
                
                # Parse the resulting converter, possibly recursively resolving templates
                return parseConverter(
                    template[0],
                    filename,
                    capitalizeDisplayNames,
                    templateDir,
                    defaultImgPath,
                    defaultImgExt,
                    projectPath
                )

        else:
            # Regular converter, parse as usual

            # If the ID isn't set, set ID to the file name (without extension)
            if(not "id" in converter):
                converter["id"] = filename.replace(".json", "")

            # If no display name set, set display name to the file name (replacing _ with spaces and potentially capitalizing words)
            if(not "displayName" in converter):
                temp = str(converter["id"]).replace("_", " ")
                converter["displayName"] = temp.title() if capitalizeDisplayNames else temp

            # If no image set, set image to the ID
            if(not "displayImage" in converter):
                converter["displayImage"] = f"{defaultImgPath}/{converter["id"]}.{defaultImgExt}"

            # If other fields are missing, add a warning to be printed out
            if(not ("consumes" in converter and "produces" in converter)):
                raise ParseException(f"{filename} is missing a production or consumption list!")

            # Add to a list of all converters
            return converter
    
    raise ParseException("Root object must be a string!")