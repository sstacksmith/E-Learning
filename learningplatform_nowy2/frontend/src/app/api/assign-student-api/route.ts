import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/config/firebase';
import { doc, updateDoc, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { studentId, instructorId, instructorType, isPrimary = false } = await request.json();

    if (!studentId || !instructorId || !instructorType) {
      return NextResponse.json(
        { error: 'ID studenta, instruktora i typ instruktora są wymagane' },
        { status: 400 }
      );
    }

    // Validate instructor type (only new instructor roles)
    const validInstructorTypes = ['tutor', 'wychowawca', 'nauczyciel_wspomagajacy'];
    if (!validInstructorTypes.includes(instructorType)) {
      return NextResponse.json(
        { error: 'Nieprawidłowy typ instruktora' },
        { status: 400 }
      );
    }

    // Get current student data
    const studentRef = doc(db, 'users', studentId);
    const studentDoc = await getDoc(studentRef);
    
    if (!studentDoc.exists()) {
      return NextResponse.json(
        { error: 'Student nie został znaleziony' },
        { status: 404 }
      );
    }

    const studentData = studentDoc.data();
    const currentAssignedInstructors = studentData.assignedInstructors || [];
    const currentPrimaryTutorId = studentData.primaryTutorId;

    let updateData: any = {};

    if (isPrimary) {
      // Set as primary instructor
      updateData.primaryTutorId = instructorId;
      
      // Remove from assigned instructors if already there
      if (currentAssignedInstructors.includes(instructorId)) {
        updateData.assignedInstructors = currentAssignedInstructors.filter((id: string) => id !== instructorId);
      }
    } else {
      // Add to assigned instructors
      if (!currentAssignedInstructors.includes(instructorId)) {
        updateData.assignedInstructors = arrayUnion(instructorId);
      }
      
      // If was primary instructor, remove from that role
      if (currentPrimaryTutorId === instructorId) {
        updateData.primaryTutorId = null;
      }
    }

    // Update student document
    await updateDoc(studentRef, updateData);

    console.log(`✅ Student ${studentId} assigned to instructor ${instructorId} as ${isPrimary ? 'primary' : 'assigned'}`);

    return NextResponse.json({
      success: true,
      message: `Student został ${isPrimary ? 'ustawiony jako główny instruktor' : 'przypisany do instruktora'} pomyślnie`,
      studentId,
      instructorId,
      instructorType,
      isPrimary
    });

  } catch (error) {
    console.error('Error assigning student to instructor:', error);
    return NextResponse.json(
      { error: 'Błąd podczas przypisywania studenta do instruktora' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { studentId, instructorId } = await request.json();

    if (!studentId || !instructorId) {
      return NextResponse.json(
        { error: 'ID studenta i instruktora są wymagane' },
        { status: 400 }
      );
    }

    // Get current student data
    const studentRef = doc(db, 'users', studentId);
    const studentDoc = await getDoc(studentRef);
    
    if (!studentDoc.exists()) {
      return NextResponse.json(
        { error: 'Student nie został znaleziony' },
        { status: 404 }
      );
    }

    const studentData = studentDoc.data();
    const currentAssignedInstructors = studentData.assignedInstructors || [];
    const currentPrimaryTutorId = studentData.primaryTutorId;

    let updateData: any = {};

    // Remove from assigned instructors
    if (currentAssignedInstructors.includes(instructorId)) {
      updateData.assignedInstructors = arrayRemove(instructorId);
    }

    // Remove from primary instructor if was primary
    if (currentPrimaryTutorId === instructorId) {
      updateData.primaryTutorId = null;
    }

    // Update student document
    await updateDoc(studentRef, updateData);

    console.log(`✅ Student ${studentId} unassigned from instructor ${instructorId}`);

    return NextResponse.json({
      success: true,
      message: 'Student został odłączony od instruktora pomyślnie',
      studentId,
      instructorId
    });

  } catch (error) {
    console.error('Error unassigning student from instructor:', error);
    return NextResponse.json(
      { error: 'Błąd podczas odłączania studenta od instruktora' },
      { status: 500 }
    );
  }
}
