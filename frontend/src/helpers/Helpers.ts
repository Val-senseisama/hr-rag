// utils/dateFormatter.ts
export const formatDate = (dateString: string): string => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
  
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date string');
      }
  
      const month = months[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
  
      return `${month} ${day}, ${year}`;
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
  };