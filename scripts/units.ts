/**
 * Handles unit conversions
 */

import { GraphError } from "./errors";
import { Rational } from "./rational";
import { UnitGroup, UnitGroupData } from "./types";

const unitGroups = new Map<string, UnitGroup>();
let defaultUnitGroup: string = "UNINITIALIZED";

export function getDefaultUnitGroup() {
    return defaultUnitGroup;
}

export function loadUnitGroups(
    groups: [string, UnitGroupData][],
    defaultGroup: string,
) {
    defaultUnitGroup = defaultGroup;
    for (const [name, group] of groups) {
        unitGroups.set(name, {
            default: group.default,
            conversions: group.conversions.map(([name, r]) => [
                name,
                Rational.fromData(r),
            ]),
        });
    }
}

export function convertUnit(
    groupName: string,
    amount: Rational,
    unit: string,
): Rational {
    const group = unitGroups.get(groupName);
    if (!group) throw new GraphError(`Unit group ${groupName} not found!`);

    if (group.default === unit) return amount;

    const conv = group.conversions.find(([name]) => name === unit);
    if (!conv)
        throw new GraphError(
            `Unit ${unit} can't be found in unit group ${groupName}!`,
        );

    return amount.mul(conv[1]);
}

/**
 * Get a list of all units for the group with the given name
 * @param groupName The name of the group to search
 * @returns A list where the first element is a list of units and the second element
 * is the default unit
 */
export function getUnits(groupName: string): [string[], string] {
    const group = unitGroups.get(groupName);
    if (!group) throw new GraphError(`Unit group ${groupName} not found!`);
    const output = group.conversions.map((el) => el[0]);
    output.push(group.default);
    return [output, group.default];
}

/**
 * Populate the given dropdown with all units from a given unit group. Will clear any
 * HTML previously inside the element.
 * @param selectEl The element to populate
 * @param groupName The name of the unit group that should be populating the dropdown
 */
export function populateUnitDropdown(
    selectEl: HTMLSelectElement,
    groupName: string,
) {
    selectEl.innerHTML = "";
    const [units, defaultUnit] = getUnits(groupName);

    for (const unit of units) {
        const optionEl = document.createElement("option");
        optionEl.innerText = unit;
        selectEl.appendChild(optionEl);
        if (unit === defaultUnit) optionEl.selected = true;
    }
}
