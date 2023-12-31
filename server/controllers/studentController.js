const studentUtils = require('../utils/studentUtils');
const examUtils = require('../utils/examUtils');
const studentValidator = require('../validators/studentValidator');

async function getStudents(req, res) {
  try {
    const students = await studentUtils.getStudents();
    res.json(students);
  } catch (error) {
    console.error('Error getting students', error);
    res.status(500).json({ status: 500, message: 'Error getting students', error: error.message });
  }
}


async function getExamsForSelectedStudent(req, res) {
  const studentNo = req.params.studentNo;

  try {
    const existingStudent = await studentUtils.findStudentByNo(studentNo);
    if (!existingStudent) {
      return res.status(404).json({ status: 404, message: 'Student not found' });
    }

    const registeredExams = await examUtils.getExamsForSelectedStudent(studentNo);
    const registeredExamsScores = await examUtils.getScoresForSelectedStudent(studentNo);

    const examsWithScores = registeredExams.map((exam) => {
      const matchingExam = registeredExamsScores.find((score) => score._id.equals(exam._id));
      const score = matchingExam.registeredStudents[0].score;

      return {
        ...exam.toObject(),
        score
      };
    });

    res.json(examsWithScores);

  } catch (error) {
    console.error('Error getting exams for student', error);
    res.status(500).json({ status: 500, message: 'Error getting exams for student', error: error.message });
  }
}


async function addStudent(req, res) {
  const { name, surname, email, no, password } = req.body;
  try {
    const studentEmailControl = await studentUtils.findStudentByEmail(email);
    const studentNoControl = await studentUtils.findStudentByNo(no);

    if (studentEmailControl) {
      res.status(400).json({ message: `Student Email ${email} is already registered.` });
    }

    else if (studentNoControl) {
      res.status(400).json({ message: `Student No ${no} is already registered.` });
    }

    else {
      const newStudent = await studentUtils.createStudent(name, surname, email, no, password);
      if (newStudent) {
        res.status(200).json({ message: 'Student added successfully.' });
      }
    }
  } catch (error) {
    console.error('Error adding student', error);
    res.status(500).json({ message: 'Error adding student', error: error.message });
  }
}

async function deleteStudent(req, res) {
  const studentId = req.params.studentId;

  try {
    const existingStudent = await studentUtils.findStudentById(studentId);

    if (!existingStudent) {
      return res.status(400).json({ message: 'Student not found.' });
    }

    const studentNo = existingStudent.no;
    const exams = await examUtils.getExams();

    for (const exam of exams) {
      exam.registeredStudents = exam.registeredStudents.filter(
        (registeredStudent) => registeredStudent.no !== studentNo
      );
      await exam.save();
    }

    await studentUtils.deleteStudentById({ _id: studentId });
    return res.status(200).json({ message: 'Student deleted successfully.' });

  } catch (error) {
    console.error('Error deleting student', error);
    res.status(500).json({ message: 'Error deleting student', error: error.message });
  }
}

async function updateStudent(req, res) {
  const studentId = req.params.studentId;

  const { no, email, password, name, surname, absenteeism } = req.body;

  try {
    const studentNoControl = await studentUtils.findStudentByNo(no);
    const studentEmailControl = await studentUtils.findStudentByEmail(email);
    const existingStudent = await studentUtils.findStudentById(studentId);

    if (!existingStudent) {
      return res.status(400).json({ message: 'Student not found.' });
    }

    if (studentValidator.validateNo(no)) {
      return res.status(400).json({ message: 'Student Number must be between 3-15 digits' });
    }

    if (studentValidator.validateEmail(email)) {
      return res.status(400).json({ message: 'Student Email must be between 3-40 characters' });
    }

    if (studentValidator.validatePassword(password)) {
      return res.status(400).json({ message: 'Student Password must be between 6-20 characters' });
    }

    if (studentValidator.validateName(name)) {
      return res.status(400).json({ message: 'Student Name must be between 3-20 characters' });
    }

    if (studentValidator.validateName(surname)) {
      return res.status(400).json({ message: 'Student Surname must be between 3-20 characters' });
    }

    if (studentValidator.validateAbsenteeism(absenteeism)) {
      return res.status(400).json({ message: 'Student Surname must be max 3 digits' });
    }


    if (studentEmailControl) {
      if (studentEmailControl.email !== existingStudent.email) {
        return res.status(400).json({ message: `Update failed for student email ${existingStudent.email} (${existingStudent.no}). Student email ${email} is already registered for ${studentEmailControl.name} ${studentEmailControl.surname} (${studentEmailControl.no})` });
      }
    }
    if (studentNoControl) {
      if (studentNoControl.no !== existingStudent.no) {
        return res.status(400).json({ message: `Update failed for student no ${existingStudent.no} (${existingStudent.email}). Student no ${email} is already registered for ${studentNoControl.name} ${studentNoControl.surname} (${studentNoControl.email})` });
      }
    }



    let controlRegisteredExams = false;
    let registeredExamsNames = [];

    const exams = await examUtils.getExams();

    for (const exam of exams) {
      for (const registeredStudent of exam.registeredStudents) {
        if (registeredStudent.no === existingStudent.no) {
          registeredStudent.no = no;
          controlRegisteredExams = true;
          registeredExamsNames.push(`${exam.name} ${exam.type}`);
        }
      }
      await exam.save();
    }

    const updatedStudent = await studentUtils.findStudentByIdAndUpdate( studentId, req.body);

    if (updatedStudent) {
      if (controlRegisteredExams) {
        return res.status(200).json({ message: `Student updated successfully. Registered information for exams found and has been updated. (${registeredExamsNames})` });
      }
      return res.status(200).json({ message: 'Student updated successfully.' });
    }
  } catch (error) {
    console.error('Error updating student', error);
    res.status(500).json({ message: 'Error updating student', error: error.message });
  }
}



module.exports = { getStudents, getExamsForSelectedStudent, addStudent, deleteStudent, updateStudent };