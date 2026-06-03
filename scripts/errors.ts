/**
 * Contains a few different errors that are thrown when something goes wrong or is
 * incorrectly handled.
 */

/**
 * When the user does something wrong, like finalizing a tree before all the ORs are
 * resolved
 */
export class UserError extends Error {}

/**
 * When the graph JSON is badly configured, i.e. not a user error *or* a programming
 * error, more a data error I guess?
 */
export class GraphError extends Error {}

/**
 * When something unexpected happens in the program.
 */
export class ProgramError extends Error {}

export function displayErr(e: Error) {
    if (e instanceof UserError) {
        alert(`${e.message}`);
    } else if (e instanceof GraphError) {
        alert(`Configuration error: ${e.message}`);
    } else if (e instanceof ProgramError) {
        alert(`INTERNAL ERROR: ${e.message}\n\nPlease report this as a bug!`);
    }
    throw e;
}
