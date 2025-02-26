export function getAge(birthMonth: number, birthYear: number) {
    const today = new Date(); 
    console.log(today);

    const years = today.getFullYear() - birthYear; 
    const months = (today.getMonth() + 1) - birthMonth; 
    console.log(months);

    const ageInMonths = (12 * years) + months; 
    const age = Math.floor(ageInMonths / 12); 
    console.log(age);

    return age; 
}