import { ComponentRelation } from "../../../types";

/**
 * Helper class to filter out non-components from component relations
 * Used in SEO analyzers to avoid treating utility functions as components
 */
export class ComponentFilter {
  /**
   * Check if a ComponentRelation represents an actual React component
   * vs utility functions, hooks, or event handlers
   */
  public static isActualComponent(component: ComponentRelation): boolean {
    const name = component.name;

    // Rule 1: Must follow PascalCase convention
    if (!name || name[0] !== name[0].toUpperCase()) {
      return false;
    }

    // Rule 2: Exclude custom hooks (functions starting with "use")
    if (name.startsWith("use") && name.length > 3) {
      return false;
    }

    // Rule 3: Exclude common non-component patterns
    const nonComponentPatterns = [
      /^handle[A-Z]/, // handleClick, handleSubmit, etc.
      /^on[A-Z]/, // onClick, onSubmit, etc.
      /^get[A-Z]/, // getUser, getData, etc.
      /^set[A-Z]/, // setUser, setData, etc.
      /^fetch[A-Z]/, // fetchUser, fetchData, etc.
      /^create[A-Z]/, // createUser, createData, etc.
      /^update[A-Z]/, // updateUser, updateData, etc.
      /^delete[A-Z]/, // deleteUser, deleteData, etc.
      /^is[A-Z]/, // isValid, isLoading, etc.
      /^has[A-Z]/, // hasPermission, hasData, etc.
      /^can[A-Z]/, // canEdit, canDelete, etc.
      /^should[A-Z]/, // shouldRender, shouldUpdate, etc.
      /^will[A-Z]/, // willUpdate, willMount, etc.
      /^did[A-Z]/, // didUpdate, didMount, etc.
      /^toggle[A-Z]/, // toggleSidebar, toggleModal, etc.
      /^open[A-Z]/, // openModal, openDialog, etc.
      /^close[A-Z]/, // closeModal, closeDialog, etc.
      /^show[A-Z]/, // showModal, showDialog, etc.
      /^hide[A-Z]/, // hideModal, hideDialog, etc.
      /^clear[A-Z]/, // clearForm, clearData, etc.
      /^reset[A-Z]/, // resetForm, resetState, etc.
      /^submit[A-Z]/, // submitForm, submitData, etc.
      /^validate[A-Z]/, // validateForm, validateInput, etc.
      /^format[A-Z]/, // formatDate, formatCurrency, etc.
      /^parse[A-Z]/, // parseData, parseJSON, etc.
      /^transform[A-Z]/, // transformData, transformInput, etc.
      /^filter[A-Z]/, // filterData, filterResults, etc.
      /^sort[A-Z]/, // sortData, sortResults, etc.
      /^map[A-Z]/, // mapData, mapResults, etc.
      /^reduce[A-Z]/, // reduceData, reduceResults, etc.
    ];

    if (nonComponentPatterns.some((pattern) => pattern.test(name))) {
      return false;
    }

    // Rule 4: Check if content actually contains JSX return patterns
    if (component.content && !this.hasJSXReturnPattern(component.content)) {
      return false;
    }

    // Rule 5: If it's exported and follows naming conventions, likely a component
    if (component.exports.includes(name)) {
      return true;
    }

    return true;
  }

  /**
   * Filter an array of ComponentRelations to only include actual React components
   */
  public static filterComponents(
    components: ComponentRelation[]
  ): ComponentRelation[] {
    return components.filter((component) => this.isActualComponent(component));
  }

  /**
   * Simple heuristic to check if content contains JSX return patterns
   */
  private static hasJSXReturnPattern(content: string): boolean {
    // Look for return statements with JSX-like patterns
    const jsxReturnPatterns = [
      /return\s*\(\s*</, // return (<
      /return\s*</, // return <
      /=>\s*\(\s*</, // => (<
      /=>\s*</, // => <
    ];

    return jsxReturnPatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Check if a component name follows React component naming conventions
   */
  public static followsComponentNaming(name: string): boolean {
    // Must start with uppercase letter
    if (!name || name[0] !== name[0].toUpperCase()) {
      return false;
    }

    // Should not be a hook
    if (name.startsWith("use")) {
      return false;
    }

    return true;
  }
}
