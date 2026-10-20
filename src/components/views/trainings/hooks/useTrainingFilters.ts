import { useState, useMemo } from 'react';
import { Training } from '../../../../types';
import { matchesTrainingNumberSearch } from '../../../../lib/trainingNumbering';

export function useTrainingFilters(trainings: Training[]) {
  const [listFilter, setListFilter] = useState<'scheduled' | 'completed'>('scheduled');
  const [listSearch, setListSearch] = useState('');

  const todayTimestamp = new Date().setHours(0, 0, 0, 0);

  const filteredTrainingsList = useMemo(() => {
    return (trainings || [])
      .filter((tr) => {
        const isCompleted = tr.completed !== false;
        if (listFilter === 'scheduled' && isCompleted) return false;
        if (listFilter === 'completed' && !isCompleted) return false;

        if (listSearch.trim() !== '') {
          const q = listSearch.toLowerCase().trim();
          const matchesNum = matchesTrainingNumberSearch(tr, q);
          const matchesDate = (tr.date || '').includes(q);
          const matchesNotes = (tr.notes || '').toLowerCase().includes(q);
          const matchesType = (tr.type || '').toLowerCase().includes(q);
          const matchesLoc = (tr.location || '').toLowerCase().includes(q);
          return matchesNum || matchesDate || matchesNotes || matchesType || matchesLoc;
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.date).setHours(0, 0, 0, 0);
        const timeB = new Date(b.date).setHours(0, 0, 0, 0);

        if (listFilter === 'scheduled') {
          const isFutureA = timeA >= todayTimestamp;
          const isFutureB = timeB >= todayTimestamp;
          if (isFutureA && isFutureB) {
            if (timeA !== timeB) return timeA - timeB;
            return (a.trainingNumber || 0) - (b.trainingNumber || 0);
          }
          if (isFutureA && !isFutureB) return -1;
          if (!isFutureA && isFutureB) return 1;
          if (timeB !== timeA) return timeB - timeA;
          return (b.trainingNumber || 0) - (a.trainingNumber || 0);
        } else {
          // Completed: newest / highest number first
          if (timeB !== timeA) return timeB - timeA;
          return (b.trainingNumber || 0) - (a.trainingNumber || 0);
        }
      });
  }, [trainings, listFilter, listSearch, todayTimestamp]);

  return {
    listFilter,
    setListFilter,
    listSearch,
    setListSearch,
    filteredTrainingsList
  };
}
