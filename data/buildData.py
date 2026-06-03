#
# Runs both data building scripts in sequence.
#

import generateResources;
import packageConverters;
packageConverters.build()
generateResources.build()
